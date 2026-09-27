// Official Cairo University Year-3 Conservative Dentistry rubrics.
// Transcribed from "Third Year Logbook – Extracted Rubrics" (pages 22–79 of the printed logbook).
// Each criterion has four bands: A = 9–10, B = 7.5–8.5, C = 6–7 (preps) / 6.5–7 (restorations), D = below 6.
// photo: how far a single occlusal/proximal smartphone photo can show this criterion
//   'yes' = visible, 'partial' = only partly (needs probe / second view), 'no' = needs the physical tooth.
// weight: optional marks out of 10 (only the Class I composite rubric has official per-criterion marks).

export const BANDS_PREP = [
  { key: 'A', label: 'Accepted 9–10', mid: 9.5 },
  { key: 'B', label: 'Accepted 7.5–8.5', mid: 8 },
  { key: 'C', label: 'Accepted 6–7', mid: 6.5 },
  { key: 'D', label: 'Unaccepted <6', mid: 4.5 },
];
export const BANDS_RESTO = [
  { key: 'A', label: 'Accepted 9–10', mid: 9.5 },
  { key: 'B', label: 'Accepted 7.5–8.5', mid: 8 },
  { key: 'C', label: 'Accepted 6.5–7', mid: 6.75 },
  { key: 'D', label: 'Unaccepted <6', mid: 4.5 },
];

export const GENERAL_GRADING = [
  { grade: '10', text: 'Exceptional work, all preparation criteria are perfect' },
  { grade: '9', text: 'Excellent work, all preparation criteria are fulfilled' },
  { grade: '8', text: 'Good work, minor deviation from criteria' },
  { grade: '6–7', text: 'Acceptable work, one or two significant deviations from criteria' },
  { grade: 'Below 6', text: 'Poor, non-acceptable work, irreversible mistakes were made, 3 or more major deviations from criteria' },
];
export const GRADING_NOTE = 'Students lose marks for improper operator / dummy-head position.';

const c = (id, group, name, bands, photo, weight) => ({ id, group, name, bands, photo, weight });
const OUT = 'Outline Form', RR = 'Resistance and Retention Forms', FIN = 'Finishing of Cavity Walls and Margins';

const occExt = c('occ_ext', OUT, 'Occlusal extensions', ['Follow central/ B/L grooves precisely', 'Slight deviation from grooves', 'Significant deviation from grooves', 'Does not follow grooves'], 'yes');
const lineAnglesRounded = c('line_angles', RR, 'Line angles', ['All line angles are completely rounded', 'Some sharp internal line angles', 'Most internal line angles are sharp', 'All internal line angles sharp or obscure'], 'partial');
const wallsFinish = c('walls', FIN, 'Walls', ['Smooth, regular', 'Slight roughness', 'Most walls are rough', 'Roughness in all walls'], 'yes');
const adjacent = c('adjacent', 'Adjacent Tooth Damage', 'Adjacent tooth damage', ['No damage', 'Slight', 'Significant', 'Gross'], 'partial');
const smoothOutline = c('outline', OUT, 'Outline', ['Smooth sweeping curves', 'Slightly sharp', 'Markedly sharp', 'Angular junction between margins'], 'yes');
const finishResto = c('finish', 'Finish', 'Finish', ['Smooth; no voids, pits, or roughness', 'Slight roughness', 'Rough; some pits; voids', 'Grossly rough'], 'yes');
const finishAmalgam = c('finish', 'Finish', 'Finish', ['Burnished and smooth; no voids, pits, or roughness', 'Slight roughness', 'Rough; some pits; voids', 'Grossly rough'], 'yes');
const contactTight = c('contact', 'Proximal', 'Interproximal contact and contour', ['Proper contact/ contour restored with adjacent tooth', 'Tight interproximal contact', 'Light interproximal contact; poor contour', 'Open or too tight interproximal contact'], 'no');
const contactBulging = c('contact', 'Proximal', 'Interproximal contact and contour', ['Proper contact/ contour restored with adjacent tooth', 'Light interproximal contact', 'Deficient interproximal contact; poor contour', 'Open or bulging interproximal contact'], 'no');
const proxMarginsComposite = c('prox_margins', 'Proximal', 'Proximal margins', ['Proper embrasures with no buccal/ lingual or gingival flashes', 'Slightly under- or over-finished margins but no composite flashes', 'Under- or over-finished margins with some composite flashes', 'Grossly under- or over-finished margins with flashes B/L and gingival overhang'], 'partial');
const compositeMargins = (id, group, name) => c(id, group, name, ['Interface between tooth and restoration not detectable with explorer', 'Slight over- or under-finished margins, but still closed', 'Composite flashes or slight underfilling', 'Open margins or significant flashes all around the margins'], 'partial');
const anatomy = (id, group, name, d) => c(id, group, name, ['Restoration duplicates tooth anatomy', 'Slight deviation from ideal anatomy', 'Significant deviation from ideal anatomy', d], 'yes');

export const RUBRICS = [
  {
    id: 'c1_comp_prep', term: 1, kind: 'prep', title: 'Class I Cavity Preparation for Composite', bands: BANDS_PREP,
    source: 'Sample 1 CU rubric evaluation (per-criterion marks). Lower-band wording taken from the Class II composite rubric — please confirm.',
    needsConfirmation: true,
    criteria: [
      { ...occExt, weight: 1 },
      c('occ_outline', OUT, 'Occlusal outline', ['Smooth sweeping curves', 'Slightly sharp', 'Markedly sharp', 'Lack of curves'], 'yes', 1),
      c('occ_width', OUT, 'Occlusal width', ['No more than ¼ intercuspal distance', 'Slightly > ¼ intercuspal', '1/3 intercuspal', '>1/3 intercuspal'], 'yes', 1),
      c('depth', RR, 'Preparation depth', ['1.2–1.5 mm', 'Slightly deeper or shallower', 'Clearly too deep or too shallow', 'Grossly too deep or too shallow'], 'partial', 2),
      c('inclination', RR, 'Inclination of walls', ['Slight convergence B; L/M, D walls', 'One wall not properly aligned', 'Most walls are not properly aligned', 'Divergent B and L walls'], 'partial', 1.5),
      { ...lineAnglesRounded, weight: 1.5 },
      { ...wallsFinish, weight: 1 },
      c('margins', FIN, 'Margins and centric stop', ['Occlusal: 90°; centric occlusal stop located on tooth', 'Areas not 90°; centric stop on tooth', 'Most margins not 90°; centric stop not on tooth', 'All margins not 90°; centric stop not on tooth'], 'partial', 1),
    ],
  },
  {
    id: 'c2_comp_prep', term: 1, kind: 'prep', title: 'Class II Cavity Preparation for Composite', bands: BANDS_PREP,
    criteria: [
      occExt,
      c('occ_outline', OUT, 'Occlusal outline', ['Smooth sweeping curves', 'Slightly sharp', 'Markedly sharp', 'Lack of curves'], 'yes'),
      c('occ_width', OUT, 'Occlusal width', ['No more than ¼ intercuspal distance', 'Slightly > ¼ intercuspal', '1/3 intercuspal', '>1/3 intercuspal'], 'yes'),
      c('prox_outline', OUT, 'Proximal outline', ['Proper flaring of B, L and G walls', 'Contact broken slightly > line of explorer B, L or G', 'Slight overflaring in B/L or G walls (>0.5 mm)', 'B, L or gingival contact broken by over 1 mm'], 'partial'),
      c('depth', RR, 'Preparation depth', ['2 mm from external wall', 'Slightly >2 mm, <2 mm', '>2.5 mm; <1.5 mm', '>3 mm; <1 mm'], 'partial'),
      c('inclination', RR, 'Inclination of walls', ['Slight convergence B; L/M, D walls', 'One wall not properly aligned', 'Most walls are not properly aligned', 'Divergent B and L walls'], 'partial'),
      c('line_angles', RR, 'Line angles', ['All line angles are completely rounded', 'Some sharp internal line angles', 'Most internal line angles are sharp', 'All internal line angles sharp'], 'partial'),
      c('prox_box', RR, 'Proximal box form', ['Gingival floor in E (above CEJ); proper axial wall', 'Gingival floor slightly deep, greater than 1 mm wide', 'Gingival floor in cementum; greater than 1 mm', 'Gingival floor in cementum; greater than 2 mm wide'], 'no'),
      wallsFinish,
      c('margins', FIN, 'Margins', ['Occlusal: 90°, B/L: 0.5 mm bevel; centric occ. stop located on tooth', 'Occ: areas not 90°, B/L: areas not beveled; centric occ. stop located on tooth', 'Occ: most margins not 90°, B/L: most not beveled; centric stop not located on tooth', 'Occ: all margins not 90°, B/L: all areas not beveled; centric stop not located on tooth'], 'partial'),
      adjacent,
    ],
  },
  {
    id: 'c3_comp_prep', term: 1, kind: 'prep', title: 'Class III Cavity Preparation for Composite', bands: BANDS_PREP,
    criteria: [
      smoothOutline,
      c('palatal_outline', OUT, 'Palatal outline', ['Proper u-shape', 'Slight under- or over-extension in Inc/ G or axial walls', 'Under- or over-extension in Inc/ G or axial walls; walls not in relation with respective surfaces', 'Significant overextension axially; walls do not follow respective external surfaces'], 'yes'),
      c('prox_outline', OUT, 'Proximal outline', ['Proper pear-shaped; internal > external outline', 'Internal outline = external outline', 'Internal outline = external outline; encroaching on labial axial angle of tooth (deficient labial wall)', 'External outline > internal outline; highly deficient or lost labial wall'], 'partial'),
      lineAnglesRounded,
      wallsFinish,
      c('margins', FIN, 'Margins', ['Smooth 90°', 'Slightly rough, beveled in one wall', 'Rough margins with some margins indefinite', 'Highly rough; all margins indefinite or beveled'], 'partial'),
      adjacent,
    ],
  },
  {
    id: 'c4_comp_prep', term: 1, kind: 'prep', title: 'Class IV Cavity Preparation for Composite', bands: BANDS_PREP,
    criteria: [
      smoothOutline,
      c('outline_form', OUT, 'Outline (walls)', ['Properly shaped; each wall in relation with respective surface', 'Slight under- or over-extension in G or axial walls', 'Under- or over-extension in G or axial walls; walls not in relation with respective surfaces', 'Significant overextension axially; walls do not follow respective external surfaces'], 'yes'),
      lineAnglesRounded,
      wallsFinish,
      c('margins', FIN, 'Margins', ['Smooth 45° short bevel on the entire labial wall', 'Slightly rough, slightly over- or under-extended bevel', 'Rough margins with under-extended or obscure bevel', 'Highly rough; all margins; indefinite bevel; wrong location of bevel; no bevel'], 'partial'),
      adjacent,
    ],
  },
  {
    id: 'c5_comp_prep', term: 1, kind: 'prep', title: 'Class V Cavity Preparation for Composite', bands: BANDS_PREP,
    criteria: [
      smoothOutline,
      c('outline_form', OUT, 'Outline (extension)', ['Properly shaped; within the gingival one third', 'Slight under- or over-extension in M/D or Inc/G walls', 'Under- or over-extension in more than one wall (M/D or Inc/G walls)', 'Significant overextension incisally (height of contour) or G (cementum); encroaching M/D axial angles of tooth'], 'yes'),
      c('axial_wall', RR, 'Axial wall', ['Proper depth; following the convexity of the external surface', 'Slightly deep or shallow; improper convexity', 'Deep or shallow and flat mesio-distally', 'Deep axial wall; concave mesio-distally'], 'no'),
      c('inclination', RR, 'Inclination of walls', ['Proper; convergence of Inc wall; slightly divergent M, D walls; straight G wall', 'One wall not properly aligned', 'Most walls are not properly aligned', 'All walls of improper inclination'], 'partial'),
      lineAnglesRounded,
      wallsFinish,
      c('margins', FIN, 'Margins', ['Smooth 45° short bevel on the entire incisal wall and on proximal walls', 'Slightly rough, slightly over- or under-extended bevel', 'Rough margins with under-extended or improper inclination of bevel', 'Highly rough; all margins; indefinite bevel; bevel of gingival wall'], 'partial'),
    ],
  },
  {
    id: 'c1_amal_prep', term: 1, kind: 'prep', title: 'Class I Cavity Preparation for Amalgam', bands: BANDS_PREP,
    criteria: [
      occExt,
      c('occ_outline', OUT, 'Outline', ['Smooth sweeping curves', 'Slightly sharp', 'Markedly sharp', 'Lack of curves'], 'yes'),
      c('occ_width', OUT, 'Width', ['¼ intercuspal distance', 'Slightly <; > ¼ intercuspal', '1/3 intercuspal', 'Greater than 1/3 intercuspal'], 'yes'),
      c('depth', RR, 'Preparation depth', ['2.5 mm from external wall', '>2.5 mm, <2.5 mm', '>3.0 mm; <2.0 mm', '>3.5 mm; 1.5 mm'], 'partial'),
      c('inclination', RR, 'Inclination of walls', ['Convergence of B; L walls; slightly divergent M, D walls', 'One wall not properly aligned', 'Most walls are not properly aligned', 'Divergent B and L walls'], 'partial'),
      c('line_angles', RR, 'Line angles', ['Slightly rounded line angles', 'Some sharp internal line angles', 'Most internal line angles are sharp', 'All internal line angles sharp'], 'partial'),
      c('walls', FIN, 'Walls', ['Smooth, regular', 'Slight roughness', 'Most walls are rough', 'Significant roughness in all walls'], 'yes'),
      c('margins', FIN, 'Margins', ['Butt joint; 90° to unprepared tooth structure', 'Small areas where margins not 90°', 'Most margins are not 90°', 'Beveled margins'], 'partial'),
    ],
  },
  {
    id: 'c2_amal_prep', term: 1, kind: 'prep', title: 'Compound Class II Cavity Preparation for Amalgam', bands: BANDS_PREP,
    criteria: [
      occExt,
      c('occ_outline', OUT, 'Occlusal outline', ['Sweeping curves', 'Slightly sharp', 'Markedly sharp', 'Lack of curves'], 'yes'),
      c('occ_width', OUT, 'Occlusal width', ['¼ intercuspal distance', 'Slightly <; > ¼ intercuspal', '1/3 intercuspal', '>1/3 intercuspal'], 'yes'),
      c('isthmus', OUT, 'Isthmus width', ['Proportional with occlusal and proximal portions', 'Slightly wide; approximating width of proximal', 'Narrow; approximating width of occlusal', 'Narrow, constricted; narrower than occlusal'], 'yes'),
      c('prox_outline', OUT, 'Proximal outline', ['Proper flaring of B, L and G walls; 0.5 mm of tip of explorer', 'Contact broken slightly more than line of explorer B, L or G', 'Tooth still in contact with adjacent tooth', 'B, L or gingival contact broken by over 1 mm'], 'partial'),
      c('depth', RR, 'Preparation depth', ['2.5 mm from external wall', '>2.5 mm, <2.5 mm', '>3.0 mm; <2.0 mm', '>3.5 mm; <1.5 mm'], 'partial'),
      c('inclination', RR, 'Inclination of walls', ['Convergence of B; L walls; slightly divergent M, D walls', 'One wall not properly aligned', 'Most walls are not properly aligned', 'Divergent B and L walls'], 'partial'),
      c('line_angles', RR, 'Line angles', ['Slightly rounded line angles; axio-pulpal line angle rounded', 'Some sharp internal line angles; axio-pulpal line angle still rounded', 'Most internal line angles are sharp', 'All internal line angles sharp'], 'partial'),
      c('prox_box', RR, 'Proximal box form', ['Proper; gingival floor 1 mm wide; axial wall follows tooth curvature', 'Gingival floor slightly greater/ less than 1 mm wide', 'Gingival floor slightly greater/ less than 1 mm; improper axial wall', 'Gingival floor greater than 2 mm wide'], 'no'),
      wallsFinish,
      c('margins', FIN, 'Margins', ['Butt joint; 90°', 'Areas with margins not 90°', 'Most margins are not 90°', 'Beveled margins'], 'partial'),
      adjacent,
    ],
  },
  {
    id: 'indirect_prep', term: 1, kind: 'prep', title: 'Cavity Preparation for Indirect Esthetic Restoration', bands: BANDS_PREP,
    source: 'Logbook page 50. Wording matches the Class V sheet in several rows — please confirm it is the intended inlay/onlay rubric.',
    needsConfirmation: true,
    criteria: [
      smoothOutline,
      c('outline_form', OUT, 'Outline (extension)', ['Properly shaped; within the gingival one third', 'Slight under- or over-extension in M/D or Inc/G walls', 'Under- or over-extension in more than one wall (M/D or Inc/G walls)', 'Significant overextension incisally (height of contour) or G (cementum); encroaching M/D axial angles of tooth'], 'yes'),
      c('axial_wall', RR, 'Axial wall', ['Proper depth', 'Slightly deep or shallow', 'Deep or shallow', 'Deep axial wall'], 'no'),
      c('inclination', RR, 'Inclination of walls', ['Proper; divergence of I walls', 'One wall not properly aligned', 'Most walls are not properly aligned', 'All walls of improper inclination'], 'partial'),
      lineAnglesRounded,
      wallsFinish,
      c('margins', FIN, 'Margins', ['Smooth', 'Slightly rough', 'Rough margins', 'Highly rough'], 'partial'),
    ],
  },
  {
    id: 'c2_comp_resto', term: 2, kind: 'restoration', title: 'Class II Composite Restoration', bands: BANDS_RESTO,
    criteria: [
      anatomy('occ_anatomy', 'Occlusal', 'Occlusal anatomy', 'Anatomy is lacking with no resemblance to tooth structure'),
      c('marginal_ridge', 'Occlusal', 'Marginal ridge and occlusal embrasure', ['Proper height of marginal ridge; proper occlusal embrasure', 'Slight discrepancy in marginal ridge and occlusal embrasure', 'Narrow or wide occlusal embrasure', 'Too high, too low or fractured marginal ridge; improper occlusal embrasure'], 'partial'),
      compositeMargins('occ_margins', 'Occlusal', 'Occlusal margins'),
      contactTight,
      proxMarginsComposite,
      finishResto,
    ],
  },
  {
    id: 'c3_comp_resto', term: 2, kind: 'restoration', title: 'Class III Composite Restoration', bands: BANDS_RESTO,
    criteria: [
      c('palatal_anatomy', 'Palatal', 'Palatal anatomy', ['Restoration duplicates tooth anatomy', 'Slight deviation from ideal anatomy', 'Significant deviation from ideal anatomy, high restoration', 'Anatomy is lacking with bulging restoration'], 'yes'),
      compositeMargins('margins', 'Palatal', 'Margins'),
      contactBulging,
      proxMarginsComposite,
      finishResto,
    ],
  },
  {
    id: 'c4_comp_resto', term: 2, kind: 'restoration', title: 'Class IV Composite Restoration', bands: BANDS_RESTO,
    criteria: [
      c('palatal_anatomy', 'Palatal / Labial', 'Palatal anatomy', ['Restoration duplicates tooth anatomy', 'Slight deviation from ideal anatomy', 'Significant deviation from ideal anatomy', 'Anatomy is lacking with bulging restoration'], 'yes'),
      c('labial_contour', 'Palatal / Labial', 'Labial contour', ['Properly contoured', 'Slight under- or over-contoured', 'Significant under- or over-contoured', 'Lack of labial contour'], 'partial'),
      compositeMargins('margins', 'Palatal / Labial', 'Palatal and labial margins'),
      c('incisal', 'Palatal / Labial', 'Incisal angle / incisal edge', ['Properly contoured/ blending with tooth, with proper labio-palatal thickness', 'Slight under- or over-contour/ slight discrepancy in LP thickness', 'Significant under- or over-contour/ some discrepancy in LP thickness', 'Grossly poorly contoured/ significant discrepancy in LP thickness'], 'partial'),
      contactBulging,
      proxMarginsComposite,
      finishResto,
    ],
  },
  {
    id: 'c5_comp_resto', term: 2, kind: 'restoration', title: 'Class V Composite Restoration', bands: BANDS_RESTO,
    criteria: [
      c('labial_contour', 'Labial', 'Labial contour', ['Restoration blending with tooth anatomy with proper mesio-distal and inciso-gingival contour', 'Slight over- or under-contour', 'Significant deviation from ideal contour', 'Contour is significantly lacking or bulging restoration'], 'partial'),
      compositeMargins('margins', 'Labial', 'Margins'),
      finishResto,
    ],
  },
  {
    id: 'c1_amal_resto', term: 2, kind: 'restoration', title: 'Class I Amalgam Restoration', bands: BANDS_RESTO,
    criteria: [
      anatomy('anatomy', 'Restoration', 'Anatomy', 'Anatomy is lacking with no resemblance to tooth structure'),
      c('margins', 'Restoration', 'Margins', ['Interface between tooth and restoration not detectable with explorer', 'Over-carved margins, but still closed', 'Restoration short of margin, but still closed or slight amalgam flashes', 'Open margins or significant flashes all around the margins'], 'partial'),
      finishAmalgam,
    ],
  },
  {
    id: 'c2_amal_resto', term: 2, kind: 'restoration', title: 'Class II Amalgam Restoration', bands: BANDS_RESTO,
    criteria: [
      anatomy('occ_anatomy', 'Occlusal', 'Occlusal anatomy', 'Anatomy is lacking with no resemblance to tooth structure'),
      c('marginal_ridge', 'Occlusal', 'Marginal ridge and occlusal embrasure', ['Proper height of marginal ridge; proper occlusal embrasure', 'Slight discrepancy in marginal ridge and occlusal embrasure', 'Narrow or wide occlusal embrasure', 'Too high, too low or fractured marginal ridge; improper occlusal embrasure'], 'partial'),
      c('occ_margins', 'Occlusal', 'Occlusal margins', ['Interface between tooth and restoration not detectable with explorer', 'Over-carved margins, but still closed', 'Restoration short of margin, but still closed or slight amalgam flashes', 'Open margins or significant flashes all around the margins'], 'partial'),
      contactTight,
      c('prox_margins', 'Proximal', 'Proximal margins', ['Proper embrasures with no buccal/ lingual or gingival flashes', 'Slightly under-carved or over-carved margins but no amalgam flashes', 'Slightly under-carved or over-carved margins with some amalgam flashes', 'Under-carved or over-carved margins with amalgam flashes B/L and gingival overhang'], 'partial'),
      finishAmalgam,
    ],
  },
];

export const rubricById = Object.fromEntries(RUBRICS.map((r) => [r.id, r]));

// Suggested overall grade from chosen bands (a suggestion only — the demonstrator enters the official grade).
export function suggestGrade(rubric, picks) {
  let tot = 0, w = 0;
  for (const cr of rubric.criteria) {
    const k = picks[cr.id];
    if (!k) continue;
    const band = rubric.bands.find((b) => b.key === k);
    const wt = cr.weight || 1;
    tot += band.mid * wt; w += wt;
  }
  return w ? Math.round((tot / w) * 4) / 4 : null;
}
