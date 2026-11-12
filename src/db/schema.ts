import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default('Botanist'),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userPlants = pgTable('user_plants', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  species: text('species').notNull(),
  scientificName: text('scientific_name').default(''),
  addedDate: text('added_date').notNull(),
  location: text('location').default('Indoor Sanctuary'),
  potSize: text('pot_size').default('Medium (25cm)'),
  soilType: text('soil_type').default('Loamy Aroid Mix'),
  sunlight: text('sunlight').default('Bright Indirect'),
  healthScore: integer('health_score').default(92).notNull(),
  status: text('status').default('Healthy').notNull(),
  lastWatered: text('last_watered').notNull(),
  nextWatering: text('next_watering').notNull(),
  lastFertilized: text('last_fertilized').default('2026-10-28'),
  heightCm: real('height_cm').default(45),
  notes: text('notes').default(''),
  imageUrl: text('image_url').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const plantDiagnoses = pgTable('plant_diagnoses', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  plantId: integer('plant_id'),
  plantName: text('plant_name').notNull(),
  scientificName: text('scientific_name').default(''),
  plantCategory: text('plant_category').default('Botanical Specimen'),
  diagnosisType: text('diagnosis_type').notNull(), // 'disease' | 'nutrient' | 'identification' | 'pest' | 'rescue'
  possibleCondition: text('possible_condition').notNull(),
  confidence: integer('confidence').default(88).notNull(),
  healthScore: integer('health_score').default(78).notNull(),
  severity: text('severity').default('Moderate').notNull(),
  symptoms: text('symptoms').notNull(),
  causes: text('causes').notNull(),
  recommendations: text('recommendations').notNull(),
  prevention: text('prevention').notNull(),
  imageUrl: text('image_url').default(''),
  reportJson: text('report_json').default('{}'),
  scannedDate: text('scanned_date').default('2026-11-12'),
  isConfirmed: boolean('is_confirmed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const careTasks = pgTable('care_tasks', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  plantId: integer('plant_id'),
  plantName: text('plant_name').notNull(),
  taskType: text('task_type').notNull(), // 'Watering' | 'Fertilizing' | 'Pruning' | 'Repotting' | 'Pest Inspection' | 'Disease Follow-up' | 'Growth Photo'
  title: text('title').notNull(),
  dueDate: text('due_date').notNull(),
  completed: boolean('completed').default(false).notNull(),
  frequency: text('frequency').default('Weekly'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const soilRecords = pgTable('soil_records', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  plantName: text('plant_name').notNull(),
  soilType: text('soil_type').notNull(),
  ph: real('ph').notNull(),
  moisture: real('moisture').notNull(),
  temperature: real('temperature').notNull(),
  nitrogen: text('nitrogen').default('Optimal'),
  phosphorus: text('phosphorus').default('Optimal'),
  potassium: text('potassium').default('Optimal'),
  aiSummary: text('ai_summary').notNull(),
  recommendations: text('recommendations').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const growthLogs = pgTable('growth_logs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  plantId: integer('plant_id'),
  plantName: text('plant_name').notNull(),
  heightCm: real('height_cm').notNull(),
  leafCount: integer('leaf_count').notNull(),
  observation: text('observation').notNull(),
  healthScore: integer('health_score').default(90).notNull(),
  recordedDate: text('recorded_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const growthRecords = pgTable('growth_records', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  plantId: integer('plant_id'),
  plantName: text('plant_name').notNull(),
  heightCm: real('height_cm').notNull(),
  leafCount: integer('leaf_count').notNull(),
  observation: text('observation').notNull(),
  healthScore: integer('health_score').default(90).notNull(),
  recordedDate: text('recorded_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gardenDesigns = pgTable('garden_designs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  style: text('style').notNull(),
  spaceType: text('space_type').notNull(),
  dimensions: text('dimensions').notNull(),
  sunlight: text('sunlight').notNull(),
  climate: text('climate').notNull(),
  budget: text('budget').notNull(),
  layoutJson: text('layout_json').notNull(),
  aiRecommendations: text('ai_recommendations').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const communityPosts = pgTable('community_posts', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  authorName: text('author_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),
  plantTag: text('plant_tag').default('General'),
  likesCount: integer('likes_count').default(0).notNull(),
  commentsJson: text('comments_json').default('[]').notNull(),
  savedByJson: text('saved_by_json').default('[]').notNull(),
  moderationStatus: text('moderation_status').default('Verified Safe').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ecoActivities = pgTable('eco_activities', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(),
  waterSavedLiters: real('water_saved_liters').default(142.5).notNull(),
  compostKg: real('compost_kg').default(28.0).notNull(),
  plantsMaintained: integer('plants_maintained').default(8).notNull(),
  wasteRecycledKg: real('waste_recycled_kg').default(19.4).notNull(),
  sustainableActions: integer('sustainable_actions').default(14).notNull(),
  ecoScore: integer('eco_score').default(84).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const marketplaceOrders = pgTable('marketplace_orders', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  itemsJson: text('items_json').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status').default('Pending Configuration').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  plants: many(userPlants),
}));
