// Locations and departments can belong to a specific property (property_id).
// Rows with no property_id are shared and show for every property.
export function forProperty(list, propertyId) {
  if (!list) return []
  if (propertyId === null || propertyId === undefined || propertyId === '' || propertyId === 'all') return list
  const pid = Number(propertyId)
  return list.filter(i => i.property_id == null || Number(i.property_id) === pid)
}

// Keep an already-saved value selectable even if it isn't in the scoped list
// (e.g. an older asset that used a location from another property).
export function withCurrent(list, current) {
  if (!current || list.some(i => i.name === current)) return list
  return [...list, { id: `current-${current}`, name: current }]
}
