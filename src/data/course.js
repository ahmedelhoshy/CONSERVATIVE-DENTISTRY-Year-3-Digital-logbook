// Course structure for Year 3 Preclinical Conservative Dentistry, Cairo University, 2026–2027 (Term 1).
// Sources: Theoretical curriculum (term 1), Practical schedule (first term 2026–2027),
// Year-3 main timetable 2026/2027, Digital Logbook user manual v1.0.

export const COURSE = {
  name: 'Conservative Dentistry · Year 3 Preclinical',
  nameAr: 'العلاج التحفظي · الفرقة الثالثة',
  faculty: 'Faculty of Dentistry, Cairo University',
  facultyAr: 'كلية طب الأسنان – جامعة القاهرة',
  year: '2026–2027',
  passMark: 60,
  lectureSlot: { day: 'Saturday', start: '12:00', end: '13:00', place: 'Main hall (new building)' },
  attendanceWindowMin: 15,
  codeRotateSec: 30,
  sections: 18,
};

export const LECTURES = [
  { n: 1, date: '2026-09-19', title: 'Course Orientation — Definition, Scope and Objectives', lecturer: 'Prof. Dr. Ahmed El-Hoshy', attendanceRequired: false, note: 'Introductory lecture — attendance not compulsory.' },
  { n: 2, date: '2026-09-26', title: 'Hard Tooth Structure Defects (Non-carious lesions)', lecturer: 'Dr. Hebatallah Ahmed' },
  { n: 3, date: '2026-10-03', title: 'Dental Cariology (1)', lecturer: 'Prof. Dr. Omima Safwat' },
  { n: 4, date: '2026-10-10', title: 'Dental Cariology (2)', lecturer: 'Prof. Dr. Omima Safwat' },
  { n: 5, date: '2026-10-17', title: 'Dental Cariology (3)', lecturer: 'Prof. Dr. Omima Safwat' },
  { n: 6, date: '2026-10-24', title: 'Cavity Classifications and Nomenclature', lecturer: 'Dr. Neveen Ahmed' },
  { n: 7, date: '2026-10-31', title: 'Instruments and Instrumentation (Part I-1)', lecturer: 'Ass. Prof. Dr. Rawda Hisham' },
  { n: 8, date: '2026-11-07', title: 'Instruments and Instrumentation (Part I-2)', lecturer: 'Ass. Prof. Dr. Rawda Hisham' },
  { n: 9, date: '2026-11-14', title: 'Fundamentals of Cavity Preparation (1)', lecturer: 'Ass. Prof. Dr. Mai Mamdouh' },
  { n: 10, date: '2026-11-21', title: 'Fundamentals of Cavity Preparation (2)', lecturer: 'Ass. Prof. Dr. Mai Mamdouh' },
  { n: 11, date: '2026-11-28', title: 'Fundamentals of Cavity Preparation (3)', lecturer: 'Ass. Prof. Dr. Mai Mamdouh' },
  { n: 12, date: '2026-12-05', title: 'Fundamentals of Cavity Preparation (4)', lecturer: 'Ass. Prof. Dr. Mai Mamdouh' },
  { n: 13, date: '2026-12-12', title: 'Indirect Esthetic Restorations', lecturer: 'Dr. Yomna Sayed' },
  { n: 14, date: '2026-12-19', title: 'Instruments and Instrumentation (Part II)', lecturer: 'Ass. Prof. Dr. Rawda Hisham' },
  { n: 15, date: '2026-12-26', title: 'Light Curing Systems', lecturer: 'Prof. Dr. Shereen Hafez' },
  { n: 16, date: '2027-01-02', title: 'Tooth Form for Efficient Mastication', lecturer: 'Dr. Sara Mahmoud (Oral Biology)' },
];

// Practical weeks. `tasks` = exercises with their rubric; `req` = number of requirements (teeth) for the week.
export const PRACTICAL_WEEKS = [
  { w: 1, from: '2026-09-19', to: '2026-09-24', topic: 'Introduction to lab rules and instruments · Orientation (manual-control exercises)', orientation: true, req: 0, tasks: [] },
  { w: 2, from: '2026-09-26', to: '2026-09-30', topic: 'Class I cavity preparation for resin composite (demo/videos)', req: 1, tasks: [{ rubric: 'c1_comp_prep', teeth: ['36'] }] },
  { w: 3, from: '2026-10-03', to: '2026-10-07', topic: 'Compound Class II for composite (demo/videos)', req: 2, tasks: [{ rubric: 'c2_comp_prep', teeth: ['37', '16'] }] },
  { w: 4, from: '2026-10-10', to: '2026-10-14', topic: 'Compound Class II for composite', req: 2, tasks: [{ rubric: 'c2_comp_prep', teeth: ['36', '16'] }] },
  { w: 5, from: '2026-10-17', to: '2026-10-21', topic: 'First practical exam · Matricing systems and instrumentation', exam: true, req: 0, tasks: [] },
  { w: 6, from: '2026-10-24', to: '2026-10-28', topic: 'Class III, IV, V for composite (demo/videos) · Class III & V preparation', req: 2, tasks: [{ rubric: 'c3_comp_prep', teeth: ['11'] }, { rubric: 'c5_comp_prep', teeth: ['11'] }] },
  { w: 7, from: '2026-10-31', to: '2026-11-04', topic: 'Class III, IV & V for composite', req: 6, tasks: [{ rubric: 'c3_comp_prep', teeth: ['11', '21'] }, { rubric: 'c4_comp_prep', teeth: ['11', '21'] }, { rubric: 'c5_comp_prep', teeth: ['11', '21'] }] },
  { w: 8, from: '2026-11-07', to: '2026-11-11', topic: 'Direct resin composite veneer (demo/videos + preparation)', req: 2, tasks: [{ rubric: null, label: 'Direct composite veneer preparation', teeth: ['11', '12'] }] },
  { w: 9, from: '2026-11-14', to: '2026-11-18', topic: 'Simple Class I for amalgam', req: 2, tasks: [{ rubric: 'c1_amal_prep', teeth: ['47', '36'] }] },
  { w: 10, from: '2026-11-21', to: '2026-11-25', topic: 'Compound Class II for amalgam', req: 2, tasks: [{ rubric: 'c2_amal_prep', teeth: ['47', '36'] }] },
  { w: 11, from: '2026-11-28', to: '2026-12-02', topic: 'Second practical exam · Prevention project orientation', exam: true, req: 0, tasks: [] },
  { w: 12, from: '2026-12-05', to: '2026-12-09', topic: 'Caries removal, liner & base (demo) · Preparation & excavation on posterior teeth', req: 1, tasks: [{ rubric: null, label: 'Cavity preparation & excavation (posterior)', teeth: [] }] },
  { w: 13, from: '2026-12-12', to: '2026-12-16', topic: 'Preparation & excavation on posterior teeth · Liner & base application', req: 2, tasks: [{ rubric: null, label: 'Excavation + liner & base', teeth: [] }] },
  { w: 14, from: '2026-12-19', to: '2026-12-23', topic: 'Indirect preparation (inlay & onlay)', req: 2, tasks: [{ rubric: 'indirect_prep', teeth: ['36'] }] },
  { w: 15, from: '2026-12-26', to: '2026-12-30', topic: 'Digital workflow · Digital lab', req: 1, tasks: [{ rubric: null, label: 'Digital workflow', teeth: ['36'] }] },
];

// Operative lab slots per section (from the Year-3 main timetable). Day index: 6=Sat,0=Sun,1=Mon,2=Tue,3=Wed,4=Thu.
export const LAB_SLOTS = {
  1: [['Sat', '10:00', '12:00'], ['Mon', '12:00', '14:00']],
  2: [['Sat', '14:00', '16:00'], ['Mon', '12:00', '14:00']],
  3: [['Sat', '10:00', '12:00'], ['Wed', '10:00', '12:00'], ['Thu', '08:00', '10:00']],
  4: [['Sun', '08:00', '10:00'], ['Mon', '08:00', '10:00']],
  5: [['Sun', '10:00', '12:00'], ['Wed', '12:00', '14:00']],
  6: [['Sun', '14:00', '16:00'], ['Wed', '12:00', '14:00']],
  7: [['Sun', '14:00', '16:00'], ['Thu', '08:00', '10:00']],
  8: [['Sun', '08:00', '10:00'], ['Mon', '08:00', '10:00']],
  9: [['Mon', '10:00', '12:00'], ['Thu', '10:00', '12:00']],
  10: [['Tue', '08:00', '10:00'], ['Thu', '10:00', '12:00']],
  11: [['Mon', '14:00', '16:00'], ['Wed', '08:00', '10:00']],
  12: [['Tue', '14:00', '16:00'], ['Wed', '08:00', '10:00']],
  13: [['Mon', '16:00', '18:00'], ['Tue', '08:00', '10:00']],
  14: [['Mon', '16:00', '18:00'], ['Tue', '10:00', '12:00']],
  15: [['Tue', '10:00', '12:00'], ['Wed', '14:00', '16:00']],
  16: [['Sat', '14:00', '16:00'], ['Sun', '16:00', '18:00']],
  17: [['Tue', '14:00', '16:00'], ['Wed', '14:00', '16:00']],
  18: [['Tue', '16:00', '18:00'], ['Wed', '10:00', '12:00']],
};
export const LAB_SLOT_NOTES = ['Section 3 shows three operative-lab slots in the timetable (Sat, Wed, Thu) — please confirm.'];

export const ORIENTATION_EXERCISES = [
  { id: 'arabic_name', title: 'Arabic name written from left to right ×10', checks: ['Direction control', 'Letter consistency', 'Line control', 'Grip and posture'] },
  { id: 'line_spacing', title: 'Line-spacing control: 10 line sets at 0.5, 1.0, 1.5 and 2.0 mm', checks: ['Parallelism', 'Steady pressure', 'Uniform spacing', 'All repetitions complete'] },
  { id: 'root_shapes', title: 'Shapes on two molar roots: 4 circles (3 mm) + 4 squares (3–4 mm)', checks: ['Outline control', 'Size accuracy', 'Root surface not cut'] },
];

export const LAB_STEPS = [
  'Enter lab with PPE ready', 'Check in (attendance)', 'Confirm student, tooth and task', 'Attend briefing & demonstration',
  'Preparation checkpoint (tooth, cavity class, bur approved)', 'Initial preparation', 'Interim stop — demonstrator checks orientation and gross errors',
  'Completion — clean, dry and present', 'Self-evaluation (Prep Lens)', 'Demonstrator evaluation of the physical tooth', 'Record score, feedback and status',
];

export const PHOTO_GUIDE = [
  'Clean and secure the typodont; use good, even lighting.',
  'Place a periodontal probe beside the tooth for scale.',
  'Hold the phone about 15 cm away, at 90° to the occlusal surface.',
  'Keep the image centred, sharp, bright and free of shadows.',
];

export const TOOTH_STATUS = ['Completed', 'Incomplete', 'Not submitted'];

export function weekForDate(iso) {
  return PRACTICAL_WEEKS.find((w) => iso >= w.from && iso <= w.to) || null;
}
