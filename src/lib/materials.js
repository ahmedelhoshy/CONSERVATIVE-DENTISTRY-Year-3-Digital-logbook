// Shared by the admin Materials page and the student Learn tabs.
export const SECTION_OF = (m) => (m.kind === 'lecture' ? 'lecture' : m.kind === 'link' ? 'link' : m.kind === 'atlas' ? 'atlas' : 'practical');
export const PTYPE_OF = (m) => m.ptype || (m.kind === 'skill' ? 'guide' : 'video');
export const ATLAS_CATS = ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Composite veneer', 'Class I amalgam', 'Class II amalgam', 'Caries excavation, liner & base', 'Inlay / onlay', 'Digital workflow', 'Other'];
