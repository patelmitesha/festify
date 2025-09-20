import User from './User';
import Event from './Event';
import CouponRate from './CouponRate';
import MealChoice from './MealChoice';
import Participant from './Participant';
import Coupon from './Coupon';
import Redemption from './Redemption';
import EventRepresentative from './EventRepresentative';
import ParticipationRequest from './ParticipationRequest';

// Set up associations
User.hasMany(Event, { foreignKey: 'user_id' });
Event.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(EventRepresentative, { foreignKey: 'user_id', as: 'RepresentativeAssignments' });
User.hasMany(EventRepresentative, { foreignKey: 'assigned_by', as: 'AssignedRepresentatives' });
EventRepresentative.belongsTo(User, { foreignKey: 'user_id', as: 'Representative' });
EventRepresentative.belongsTo(User, { foreignKey: 'assigned_by', as: 'Manager' });

Event.hasMany(EventRepresentative, { foreignKey: 'event_id' });
EventRepresentative.belongsTo(Event, { foreignKey: 'event_id' });

export {
  User,
  Event,
  CouponRate,
  MealChoice,
  Participant,
  Coupon,
  Redemption,
  EventRepresentative,
  ParticipationRequest,
};