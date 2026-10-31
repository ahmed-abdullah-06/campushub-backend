/**
 * Seeds the database with demo accounts and content for evaluation/dev.
 *
 *   npm run seed:demo
 *
 * Creates (idempotently — running twice will not duplicate anything):
 *   - admin@campushub.edu / admin123        (role: admin)
 *   - alex.j@university.edu / password123   (student)
 *   - sarah.m@university.edu / password123  (student)
 *   plus sample lost & found posts, listings, events, notes and skill profiles.
 *
 * These accounts are only offered as quick logins by the frontend in DEV
 * builds; the production build does not show demo buttons.
 */
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { hashPassword } from '../src/utils/hashPassword.js';
import User from '../src/models/User.js';
import LostFound from '../src/models/LostFound.js';
import Marketplace from '../src/models/Marketplace.js';
import Event from '../src/models/Event.js';
import Note from '../src/models/Note.js';
import Skill from '../src/models/Skill.js';
import Notification from '../src/models/Notification.js';

const upsertUser = async (fields) => {
  const password = await hashPassword(fields.password);
  const user = await User.findOneAndUpdate(
    { email: fields.email.toLowerCase() },
    { $set: { ...fields, password, email: fields.email.toLowerCase() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return user;
};

const upsertContent = async (Model, match, fields) => {
  const existing = await Model.findOne(match);
  if (existing) return { doc: existing, created: false };
  const doc = await Model.create({ ...match, ...fields });
  return { doc, created: true };
};

const run = async () => {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const admin = await upsertUser({
    name: 'Campus Admin',
    email: 'admin@campushub.edu',
    password: 'admin123',
    role: 'admin',
    university: 'State University',
    major: 'Administration',
    year: 'Staff'
  });

  const alex = await upsertUser({
    name: 'Alex Johnson',
    email: 'alex.j@university.edu',
    password: 'password123',
    role: 'student',
    university: 'State University',
    major: 'Computer Science',
    year: 'Junior (Year 3)',
    bio: 'CS Junior passionate about web dev and AI.'
  });

  const sarah = await upsertUser({
    name: 'Sarah Miller',
    email: 'sarah.m@university.edu',
    password: 'password123',
    role: 'student',
    university: 'State University',
    major: 'Industrial Design',
    year: 'Senior (Year 4)',
    bio: 'Design student. Happy to trade Figma sessions for Python help.'
  });

  let created = 0;

  const items = [
    {
      match: { title: 'Blue Leather Backpack', user: alex._id },
      fields: {
        user: alex._id, type: 'lost', category: 'Bags',
        location: 'Central Library, 2nd Floor',
        description: 'Left near quiet study room 204. Contains notebooks and a water bottle.',
        dateLost: new Date().toISOString().slice(0, 10), status: 'open'
      }
    },
    {
      match: { title: 'Apple AirPods Pro Case', user: sarah._id },
      fields: {
        user: sarah._id, type: 'found', category: 'Electronics',
        location: 'Student Union Cafeteria',
        description: 'Found near the smoothie station. White charging case with a black cover.',
        dateLost: new Date().toISOString().slice(0, 10), status: 'open'
      }
    }
  ];
  for (const item of items) {
    const { created: wasCreated } = await upsertContent(LostFound, item.match, item.fields);
    if (wasCreated) created += 1;
  }

  const listings = [
    {
      match: { title: 'Calculus: Early Transcendentals (8th Ed)', seller: alex._id },
      fields: {
        seller: alex._id, price: 45, category: 'Books', condition: 'Good',
        description: 'Light highlighting on chapters 2-4. Binding intact. Great for MATH 101/102.'
      }
    },
    {
      match: { title: 'Ergonomic Desk Chair', seller: sarah._id },
      fields: {
        seller: sarah._id, price: 80, category: 'Furniture', condition: 'Like New',
        description: 'Mesh back chair with lumbar support. Used for one semester. Moving out sale.'
      }
    }
  ];
  for (const listing of listings) {
    const { created: wasCreated } = await upsertContent(Marketplace, listing.match, listing.fields);
    if (wasCreated) created += 1;
  }

  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const events = [
    {
      match: { title: 'Annual Campus Hackathon 2026', organizer: alex._id },
      fields: {
        organizer: alex._id, organizerName: alex.name,
        description: '24-hour coding challenge. Build innovative projects, network with sponsors, and win prizes!',
        date: soon.toISOString().slice(0, 10), time: '09:00 AM', endTime: '09:00 AM',
        location: 'Engineering Complex, Hall A', capacity: 200,
        attendees: [alex._id], attendeeCount: 1, category: 'Technology'
      }
    },
    {
      match: { title: 'Career & Internship Fair', organizer: admin._id },
      fields: {
        organizer: admin._id, organizerName: admin.name,
        description: 'Connect with top employers hiring for tech, business, and creative roles.',
        date: soon.toISOString().slice(0, 10), time: '10:00 AM', endTime: '04:00 PM',
        location: 'Student Activity Center', capacity: 500,
        attendees: [], attendeeCount: 0, category: 'Career'
      }
    }
  ];
  for (const event of events) {
    const { created: wasCreated } = await upsertContent(Event, event.match, event.fields);
    if (wasCreated) created += 1;
  }

  const { created: noteCreated } = await upsertContent(
    Note,
    { title: 'CS201 Data Structures Complete Study Guide', uploader: alex._id },
    {
      uploader: alex._id, uploaderName: alex.name, courseCode: 'CS 201',
      department: 'Computer Science',
      description: 'Detailed summary of Trees, Graphs, Sorting algorithms, and Big-O notation.',
      fileSize: '4.2 MB', pages: 28, downloads: 0, rating: 0, ratingCount: 0
    }
  );
  if (noteCreated) created += 1;

  const skillProfiles = [
    {
      match: { user: alex._id },
      fields: {
        userName: alex.name, major: alex.major, university: alex.university,
        offeredSkills: ['React', 'Node.js', 'Python'],
        wantedSkills: ['UI/UX Design', 'Figma', 'Public Speaking'],
        bio: 'CS Junior passionate about web dev and AI. Looking to learn Figma design principles!'
      }
    },
    {
      match: { user: sarah._id },
      fields: {
        userName: sarah.name, major: sarah.major, university: sarah.university,
        offeredSkills: ['Figma', 'UI/UX Design', 'Illustration'],
        wantedSkills: ['Python', 'React'],
        bio: 'Design senior trading visual skills for coding help.'
      }
    }
  ];
  for (const profile of skillProfiles) {
    const { created: wasCreated } = await upsertContent(Skill, profile.match, profile.fields);
    if (wasCreated) created += 1;
  }

  // A welcome notification for the demo student so the bell isn't empty
  const { created: notifCreated } = await upsertContent(
    Notification,
    { recipient: alex._id, type: 'system', message: 'Welcome to CampusHub! Complete your profile to get noticed.' },
    { recipient: alex._id, type: 'system', message: 'Welcome to CampusHub! Complete your profile to get noticed.' }
  );
  if (notifCreated) created += 1;

  console.log('\nSeed complete.');
  console.log('Demo accounts:');
  console.log('  Admin:   admin@campushub.edu   / admin123');
  console.log('  Student: alex.j@university.edu / password123');
  console.log('  Student: sarah.m@university.edu / password123');
  console.log(`New records created this run: ${created}`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
