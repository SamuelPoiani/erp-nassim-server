
import amqp, { Connection, Channel, Message, Options } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const AMQP_URL = process.env.CLOUDAMQP_URL;

let connection: Connection | null = null;

/**
 * Inicializa a conexão com o RabbitMQ, se ainda não estiver estabelecida.
 */
async function initMqConnection(): Promise<Connection> {
    if (!connection) {
        connection = await amqp.connect(AMQP_URL!);
        console.log('Conectado ao AMQP Broker');
    }
    return connection;
}

/**
 * Realiza uma chamada RPC para um serviço Nameko específico.
 * 
 * @param serviceName Nome do serviço Nameko (ex: 'news_generator')
 * @param methodName Nome do método a ser chamado no serviço (ex: 'generate')
 * @param params Lista de parâmetros a serem enviados para o método
 * @returns A resposta do serviço Nameko
 */
export async function callRpc(serviceName: string, methodName: string, params: any[]): Promise<any> {
    const conn = await initMqConnection();
    const channel: Channel = await conn.createChannel();

    const exchange = 'nameko-rpc';
    const routingKey = `${serviceName}.${methodName}`;

    await channel.assertExchange(exchange, 'topic', { durable: true });

    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });

    await channel.bindQueue(replyQueue, exchange, replyQueue);

    const correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Prepara o payload conforme esperado pelo Nameko
    const payload = {
        args: params,
        kwargs: {}
    };

    // Define as propriedades da mensagem
    const messageProperties: Options.Publish = {
        contentType: 'application/json', // Define o tipo de conteúdo
        contentEncoding: 'utf-8',        // Define a codificação do conteúdo
        correlationId: correlationId,    // Correlaciona a requisição com a resposta
        replyTo: replyQueue,             // Fila para onde a resposta deve ser enviada
    };

    console.log('Enviando payload:', JSON.stringify(payload));
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), messageProperties);

    console.log(`Mensagem enviada para exchange '${exchange}' com routing key '${routingKey}'`);

    return new Promise((resolve, reject) => {
        // Consome mensagens da fila de resposta
        channel.consume(replyQueue, (msg: Message | null) => {
            if (msg) {
                const msgCorrelationId = msg.properties.correlationId;
                if (msgCorrelationId === correlationId) {
                    const response = JSON.parse(msg.content.toString());
                    resolve(response);
                    channel.close();
                }
            }
        }, { noAck: true }).catch((err) => {
            reject(new Error('Erro ao consumir mensagens: ' + err.message));
        });
    });
}