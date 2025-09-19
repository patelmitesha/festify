import { Request, Response, NextFunction } from 'express';
import { User, Event, EventRepresentative } from '../models';
import { AuthenticatedRequest } from './auth';

export const checkEventAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.user_id;

    // Get user with role
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // If user is a manager, check if they own the event
    if ((user as any).role === 'manager') {
      const event = await Event.findOne({
        where: { event_id: eventId, user_id: userId }
      });

      if (event) {
        req.user.hasAccess = true;
        req.user.permissions = ['all']; // Managers have all permissions
        return next();
      }
    }

    // If user is a representative, check if they're assigned to this event
    if ((user as any).role === 'representative') {
      const assignment = await EventRepresentative.findOne({
        where: { event_id: eventId, user_id: userId }
      });

      if (assignment) {
        req.user.hasAccess = true;
        req.user.permissions = (assignment as any).permissions || [];
        return next();
      }
    }

    return res.status(403).json({ error: 'Access denied to this event' });
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user.hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Managers have all permissions
    if (req.user.permissions?.includes('all')) {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ error: `Permission denied: ${permission} required` });
    }

    next();
  };
};