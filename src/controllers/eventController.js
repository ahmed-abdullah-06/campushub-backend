import Event from '../models/Event.js';

export const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (error) { next(error); }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, endTime, location, capacity, category, image } = req.body;
    const newEvent = await Event.create({
      organizer: req.user ? req.user._id : null,
      organizerName: req.user ? req.user.name : 'Student Community',
      title, description, date, time, endTime, location, capacity: Number(capacity) || 50, category, image
    });
    res.status(201).json(newEvent);
  } catch (error) { next(error); }
};

export const toggleEventRegister = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }
    const userId = req.user ? req.user._id.toString() : 'guest';
    const isRegistered = event.attendees && event.attendees.some(a => a.toString() === userId);
    
    if (isRegistered) {
      event.attendees = event.attendees.filter(a => a.toString() !== userId);
      event.attendeeCount = Math.max(0, (event.attendeeCount || 1) - 1);
    } else {
      if (req.user) event.attendees.push(req.user._id);
      event.attendeeCount = (event.attendeeCount || 0) + 1;
    }
    await event.save();
    res.json(event);
  } catch (error) { next(error); }
};