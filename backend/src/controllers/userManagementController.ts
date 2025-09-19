import { Response } from 'express';
import { User, Event, EventRepresentative } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

export const createRepresentative = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, eventIds, permissions } = req.body;
    const managerId = req.user.user_id;

    // Check if user is a manager
    const manager = await User.findByPk(managerId);
    if (!manager || (manager as any).role !== 'manager') {
      res.status(403).json({ error: 'Only managers can create representatives' });
      return;
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create the representative user
    const representative = await User.create({
      name,
      email,
      password_hash,
      role: 'representative',
      created_by: managerId,
    });

    // Assign representative to events
    if (eventIds && eventIds.length > 0) {
      for (const eventId of eventIds) {
        // Verify manager owns the event
        const event = await Event.findOne({
          where: { event_id: eventId, user_id: managerId }
        });

        if (event) {
          await EventRepresentative.create({
            event_id: eventId,
            user_id: (representative as any).user_id!,
            assigned_by: managerId,
            permissions: permissions || ['add_participants', 'redeem_coupons'],
          });
        }
      }
    }

    // Get representative with assignments
    const representativeWithAssignments = await User.findByPk((representative as any).user_id, {
      include: [{
        model: EventRepresentative,
        as: 'RepresentativeAssignments',
        include: [{
          model: Event,
          attributes: ['event_id', 'name']
        }]
      }],
      attributes: { exclude: ['password_hash'] }
    });

    res.status(201).json({
      message: 'Representative created successfully',
      representative: representativeWithAssignments,
    });
  } catch (error) {
    console.error('Create representative error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyRepresentatives = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const managerId = req.user.user_id;

    // Get all representatives created by this manager
    const representatives = await User.findAll({
      where: {
        created_by: managerId,
        role: 'representative'
      },
      include: [{
        model: EventRepresentative,
        as: 'RepresentativeAssignments',
        include: [{
          model: Event,
          attributes: ['event_id', 'name']
        }]
      }],
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });

    res.json({ representatives });
  } catch (error) {
    console.error('Get representatives error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRepresentativePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { representativeId } = req.params;
    const { eventId, permissions } = req.body;
    const managerId = req.user.user_id;

    // Verify the representative was created by this manager
    const representative = await User.findOne({
      where: {
        user_id: parseInt(representativeId),
        created_by: managerId,
        role: 'representative'
      }
    });

    if (!representative) {
      res.status(404).json({ error: 'Representative not found or access denied' });
      return;
    }

    // Verify manager owns the event
    const event = await Event.findOne({
      where: { event_id: eventId, user_id: managerId }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
      return;
    }

    // Update permissions
    const [assignment] = await EventRepresentative.findOrCreate({
      where: {
        event_id: eventId,
        user_id: parseInt(representativeId),
      },
      defaults: {
        event_id: eventId,
        user_id: parseInt(representativeId),
        assigned_by: managerId,
        permissions: permissions || ['add_participants', 'redeem_coupons'],
      }
    });

    if (assignment) {
      await assignment.update({ permissions });
    }

    res.json({
      message: 'Permissions updated successfully',
      assignment,
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRepresentative = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { representativeId } = req.params;
    const managerId = req.user.user_id;

    // Verify the representative was created by this manager
    const representative = await User.findOne({
      where: {
        user_id: parseInt(representativeId),
        created_by: managerId,
        role: 'representative'
      }
    });

    if (!representative) {
      res.status(404).json({ error: 'Representative not found or access denied' });
      return;
    }

    // Delete all event assignments first
    await EventRepresentative.destroy({
      where: { user_id: parseInt(representativeId) }
    });

    // Delete the representative user
    await representative.destroy();

    res.json({ message: 'Representative deleted successfully' });
  } catch (error) {
    console.error('Delete representative error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRepresentativeEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.user_id;

    // Get events assigned to this representative
    const assignments = await EventRepresentative.findAll({
      where: { user_id: userId },
      include: [{
        model: Event,
        include: [{
          model: User,
          attributes: ['name', 'email']
        }]
      }]
    });

    const events = assignments.map(assignment => ({
      ...(assignment as any).Event?.toJSON(),
      permissions: (assignment as any).permissions,
      assigned_by: (assignment as any).assigned_by,
    }));

    res.json({ events });
  } catch (error) {
    console.error('Get representative events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};