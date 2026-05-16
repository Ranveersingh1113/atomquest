import db from '../db.js';

const ins = db.prepare(
  `INSERT INTO audit_log (entity,entity_id,user_id,action,field,old_value,new_value)
   VALUES (?,?,?,?,?,?,?)`);

export function audit(entity, entityId, userId, action, field = null, oldVal = null, newVal = null) {
  ins.run(entity, entityId, userId, action, field,
    oldVal == null ? null : String(oldVal),
    newVal == null ? null : String(newVal));
}
