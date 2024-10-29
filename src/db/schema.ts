import { 
    integer, 
    pgTable, 
    serial, 
    text, 
    timestamp, 
    varchar, 
    jsonb, 
    primaryKey 
  } from 'drizzle-orm/pg-core';
  
  // Users table
  export const usersTable = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    email: varchar('email', { length: 75 }).notNull().unique(),
    hashedPassword: text('hashed_password').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });
  
  // Authors table
  export const authorsTable = pgTable('authors', {
    id: serial('id').primaryKey(),
    description: varchar('description', { length: 300 }),
    network: jsonb('network'),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });
  
  // Posts table
  export const postsTable = pgTable('posts', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 70 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    authorId: integer('author_id')
      .notNull()
      .references(() => authorsTable.id),
    image: text('image'),
    content: text('content'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });
  
  // Roles table
  export const rolesTable = pgTable('roles', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    description: varchar('description'),
  });
  
  // Users-Roles junction table
  export const usersRolesTable = pgTable('users_roles', {
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id),
    roleId: integer('role_id')
      .notNull()
      .references(() => rolesTable.id),
  }, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }));
  
  // Newsletters table
  export const newslettersTable = pgTable('newsletters', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 75 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });
  
  // Type inference
  export type InsertUser = typeof usersTable.$inferInsert;
  export type SelectUser = typeof usersTable.$inferSelect;
  
  export type InsertAuthor = typeof authorsTable.$inferInsert;
  export type SelectAuthor = typeof authorsTable.$inferSelect;
  
  export type InsertPost = typeof postsTable.$inferInsert;
  export type SelectPost = typeof postsTable.$inferSelect;
  
  export type InsertRole = typeof rolesTable.$inferInsert;
  export type SelectRole = typeof rolesTable.$inferSelect;
  
  export type InsertUserRole = typeof usersRolesTable.$inferInsert;
  export type SelectUserRole = typeof usersRolesTable.$inferSelect;
  
  export type InsertNewsletter = typeof newslettersTable.$inferInsert;
  export type SelectNewsletter = typeof newslettersTable.$inferSelect;
