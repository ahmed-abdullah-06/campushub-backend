import Event from '../models/Event.js';
import { createNotification, clearNotificationsFor } from '../utils/notificationService.js';

const canManage = (req, doc) => {
  if (!req.user) return false;
  return req.user.role === 'admin' || String(doc.organizer) === String(req.user._id);
};

const serializeEvent = (event, userId) => {
  const obj = event.toObject ? event.toObject() : { ...event };
  const attendees = (obj.attendees || []).map((a) => String(a));
  return {
    ...obj,
    // Convenience flag for the logged-in student (null when browsing anonymously)
    isRegistered: userId ? attendees.includes(String(userId)) : false,
    attendeeCount: attendees.length || obj.attendeeCount || 0
  };
};

export const getEvents = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ date: 1, createdAt: -1 });
    res.json(events.map((e) => serializeEvent(e, req.user?._id)));
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, endTime, location, capacity, category, image } = req.body;

    if (!title || !description || !date || !location) {
      res.status(400);
      throw new Error('Please fill in title, description, date and location');
    }
    if (capacity !== undefined && capacity !== '' && Number(capacity) < 1) {
      res.status(400);
      throw new Error('Capacity must be at least 1');
    }

    // The organizer is automatically registered for their own event.
    const newEvent = await Event.create({
      organizer: req.user._id,
      organizerName: req.user.name,
      title,
      description,
      date,
      time: time || '10:00 AM',
      endTime: endTime || '',
      location,
      capacity: Number(capacity) || 50,
      attendees: [req.user._id],
      attendeeCount: 1,
      category: category || 'Academic',
      image: image || ''
    });

    res.status(201).json(serializeEvent(newEvent, req.user._id));
  } catch (error) {
    next(error);
  }
};

export const toggleEventRegister = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    const userId = String(req.user._id);
    const isRegistered = (event.attendees || []).some((a) => String(a) === userId);

    if (isRegistered) {
      event.attendees = event.attendees.filter((a) => String(a) !== userId);
    } else {
      if ((event.attendees || []).length >= event.capacity) {
        res.status(400);
        throw new Error('This event has reached its capacity');
      }
      event.attendees = [...(event.attendees || []), req.user._id];
      await createNotification({
        recipient: req.user._id,
        type: 'event',
        targetId: event._id,
        message: `You are registered for "${event.title}" on ${event.date}`
      });
    }
    await event.save();

    res.json(serializeEvent(event, req.user._id));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event (organizer or admin)
// @route   DELETE /api/events/:id
// @access  Private
export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }
    if (!canManage(req, event)) {
      res.status(403);
      throw new Error('Only the organizer or an admin can delete this event');
    }

    await event.deleteOne();
    await clearNotificationsFor(event._id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};
