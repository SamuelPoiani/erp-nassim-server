import { db } from './index';
import { rolesTable } from './schema';

async function seedRoles() {
  await db.insert(rolesTable).values([
    { id: 1, name: 'staff', description: 'Regular staff member' },
    { id: 2, name: 'admin', description: 'Administrator' },
    { id: 3, name: 'ceo', description: 'Chief Executive Officer' }
  ]);
}

seedRoles().catch(console.error);
