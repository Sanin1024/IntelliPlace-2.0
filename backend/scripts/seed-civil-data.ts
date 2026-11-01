import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Civil Engineering data...');

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin ? admin.id : 'system';

  // ============================================================
  // CAREER TRACKS
  // ============================================================
  const careerTracks: any[] = [
    { name: 'Structural Design Engineer', trackType: 'design_engineer', description: 'RCC design, steel structures, structural analysis.', targetRoles: ['Structural Engineer', 'Design Engineer'], requiredSkills: ['STAAD.Pro', 'ETABS', 'RCC Design', 'Steel Design'], recommendedSoftware: ['STAAD.Pro', 'ETABS', 'AutoCAD', 'SAP2000'] },
    { name: 'Site Engineer / Construction Engineer', trackType: 'production_engineer', description: 'Site supervision, construction management, quality control.', targetRoles: ['Site Engineer', 'Construction Manager'], requiredSkills: ['Drawing Interpretation', 'Quality Control', 'Site Supervision'], recommendedSoftware: ['AutoCAD', 'MS Project', 'Primavera'] },
    { name: 'Quantity Surveyor / Estimation Engineer', trackType: 'quality_engineer', description: 'BOQ, rate analysis, cost estimation.', targetRoles: ['Quantity Surveyor', 'Estimation Engineer'], requiredSkills: ['BOQ Preparation', 'Rate Analysis', 'Cost Estimation'], recommendedSoftware: ['Excel', 'AutoCAD', 'PlanSwift'] },
    { name: 'Transportation / Highway Engineer', trackType: 'thermal_hvac_engineer', description: 'Highway geometric design, pavement, traffic engineering.', targetRoles: ['Highway Engineer', 'Traffic Engineer'], requiredSkills: ['Highway Design', 'Pavement Design', 'GIS'], recommendedSoftware: ['Civil 3D', 'MX Road', 'GIS Software'] },
    { name: 'Geotechnical Engineer', trackType: 'maintenance_engineer', description: 'Soil mechanics, foundation engineering, slope stability.', targetRoles: ['Geotechnical Engineer', 'Foundation Engineer'], requiredSkills: ['Soil Mechanics', 'Foundation Design', 'Geotechnical Investigation'], recommendedSoftware: ['PLAXIS', 'GeoStudio', 'AutoCAD'] },
    { name: 'BIM and Digital Construction Engineer', trackType: 'cae_simulation_engineer', description: 'BIM modeling, clash detection, 4D scheduling.', targetRoles: ['BIM Engineer', 'BIM Coordinator'], requiredSkills: ['BIM', 'Revit', 'Clash Detection'], recommendedSoftware: ['Revit', 'Navisworks', 'Civil 3D'] },
  ];

  for (const t of careerTracks) {
    await prisma.careerTrack.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`  ✅ ${careerTracks.length} Civil Career tracks seeded`);

  // ============================================================
  // ENGINEERING SOFTWARE
  // ============================================================
  const software = [
    { name: 'AutoCAD', category: 'CAD', vendor: 'Autodesk', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/education', supportedFormats: ['DWG', 'DXF'], careerTracks: ['design_engineer', 'production_engineer', 'quality_engineer'], difficulty: 'beginner' },
    { name: 'Revit', category: 'BIM', vendor: 'Autodesk', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/education', supportedFormats: ['RVT'], careerTracks: ['cae_simulation_engineer'], difficulty: 'intermediate' },
    { name: 'Civil 3D', category: 'CAD', vendor: 'Autodesk', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/education', supportedFormats: ['DWG'], careerTracks: ['thermal_hvac_engineer', 'cae_simulation_engineer'], difficulty: 'advanced' },
    { name: 'STAAD.Pro', category: 'Analysis', vendor: 'Bentley', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.bentley.com/en/products/brands/staad', supportedFormats: ['STD'], careerTracks: ['design_engineer'], difficulty: 'intermediate' },
    { name: 'ETABS', category: 'Analysis', vendor: 'CSI', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.csiamerica.com/products/etabs', supportedFormats: ['EDB'], careerTracks: ['design_engineer'], difficulty: 'intermediate' },
    { name: 'Primavera P6', category: 'Planning', vendor: 'Oracle', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.oracle.com/construction-engineering/primavera-p6/', supportedFormats: ['XER'], careerTracks: ['production_engineer'], difficulty: 'advanced' },
    { name: 'PLAXIS', category: 'Analysis', vendor: 'Bentley', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.bentley.com/en/products/product-line/geotechnical-analysis-software/plaxis', supportedFormats: ['P3D'], careerTracks: ['maintenance_engineer'], difficulty: 'advanced' },
    { name: 'QGIS', category: 'GIS', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://qgis.org/en/site/forusers/trainingmaterial/index.html', supportedFormats: ['QGS'], careerTracks: ['thermal_hvac_engineer'], difficulty: 'intermediate' },
  ];

  for (const s of software) {
    await prisma.engineeringSoftware.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${software.length} Civil Engineering software seeded`);

  // ============================================================
  // COMPANY PROFILES
  // ============================================================
  const companies = [
    {
      companyName: 'Larsen & Toubro (L&T)',
      industry: 'Construction',
      officialUrl: 'https://www.larsentoubro.com',
      careersUrl: 'https://www.larsentoubro.com/careers',
      description: 'Major Indian multinational in construction, engineering, manufacturing.',
      relevantRoles: ['GET', 'Site Engineer', 'Structural Engineer'],
      requiredSkills: ['Construction Methods', 'AutoCAD', 'Project Management'],
      preferredSoftware: ['AutoCAD', 'Primavera', 'STAAD.Pro'],
      relevantSubjects: ['Construction Technology', 'Structural Analysis', 'Estimation'],
      interviewAreas: ['Construction', 'Structural Design', 'Site Management'],
    },
    {
      companyName: 'Tata Projects',
      industry: 'Infrastructure',
      officialUrl: 'https://www.tataprojects.com',
      careersUrl: 'https://www.tataprojects.com/careers',
      description: 'Leading infrastructure development company.',
      relevantRoles: ['GET', 'Planning Engineer', 'QA/QC Engineer'],
      requiredSkills: ['Construction', 'Primavera', 'Quality Control'],
      preferredSoftware: ['Primavera', 'AutoCAD', 'MS Project'],
      relevantSubjects: ['Construction Management', 'Estimation', 'Concrete Technology'],
      interviewAreas: ['Project Planning', 'Construction Methods', 'QA/QC'],
    },
    {
      companyName: 'AECOM',
      industry: 'Consultancy',
      officialUrl: 'https://www.aecom.com',
      careersUrl: 'https://careers.aecom.com',
      description: 'Global infrastructure consulting firm.',
      relevantRoles: ['Design Engineer', 'Structural Engineer', 'Highway Engineer'],
      requiredSkills: ['STAAD.Pro', 'Civil 3D', 'Design Codes'],
      preferredSoftware: ['STAAD.Pro', 'Civil 3D', 'Revit'],
      relevantSubjects: ['Structural Analysis', 'Transportation', 'Geotechnical'],
      interviewAreas: ['Structural Design', 'Highway Design', 'Software Skills'],
    },
    {
      companyName: 'Shapoorji Pallonji',
      industry: 'Construction',
      officialUrl: 'https://www.shapoorji.com',
      careersUrl: 'https://www.shapoorji.com/careers',
      description: 'Leading construction and real estate development company.',
      relevantRoles: ['Site Engineer', 'GET', 'BIM Engineer'],
      requiredSkills: ['Construction', 'AutoCAD', 'Revit'],
      preferredSoftware: ['AutoCAD', 'Revit', 'Navisworks'],
      relevantSubjects: ['Construction Technology', 'Building Materials', 'BIM'],
      interviewAreas: ['Construction', 'BIM', 'Site Management'],
    },
  ];

  for (const c of companies) {
    await prisma.civilCompanyProfile.upsert({
      where: { companyName: c.companyName },
      update: {},
      create: { ...c, createdBy: adminId, isVerified: true, lastVerifiedAt: new Date() },
    });
  }
  console.log(`  ✅ ${companies.length} Civil Company profiles seeded`);

  // ============================================================
  // CIVIL TECHNICAL QUESTIONS
  // ============================================================
  const questions = [
    // Structural Analysis
    { subject: 'Structural Analysis', topic: 'Trusses', questionText: 'In a perfect truss, the number of members (m) and joints (j) are related by:', optionA: 'm = 2j - 3', optionB: 'm = 2j - 2', optionC: 'm = 3j - 2', optionD: 'm = 2j + 3', correctAnswer: 'A', explanation: 'For a perfect truss, m = 2j - 3.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Structural Analysis', topic: 'Beams', questionText: 'The point of contraflexure is the point where:', optionA: 'Shear force is maximum', optionB: 'Bending moment is maximum', optionC: 'Bending moment changes sign', optionD: 'Shear force is zero', correctAnswer: 'C', explanation: 'At the point of contraflexure, the bending moment changes its sign (from sagging to hogging or vice versa).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    
    // RCC Design
    { subject: 'RCC Design', topic: 'Columns', questionText: 'A column is classified as a short column if the ratio of effective length to least lateral dimension is less than:', optionA: '12', optionB: '15', optionC: '20', optionD: '25', correctAnswer: 'A', explanation: 'If slenderness ratio (Leff/D) < 12, it is a short column; otherwise, it is a long column.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'RCC Design', topic: 'Reinforcement', questionText: 'The minimum grade of concrete to be used for RCC under mild exposure as per IS 456 is:', optionA: 'M15', optionB: 'M20', optionC: 'M25', optionD: 'M30', correctAnswer: 'B', explanation: 'As per IS 456:2000, the minimum grade of concrete for RCC under mild exposure is M20.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    
    // Geotechnical Engineering
    { subject: 'Geotechnical Engineering', topic: 'Soil Properties', questionText: 'The void ratio of a soil can never be:', optionA: 'Zero', optionB: 'Less than 1', optionC: 'Greater than 1', optionD: 'Negative', correctAnswer: 'D', explanation: 'Void ratio (e) = Volume of voids / Volume of solids. Both volumes are positive, so e is always positive.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Geotechnical Engineering', topic: 'Bearing Capacity', questionText: "Terzaghi's bearing capacity equation is applicable for:", optionA: 'Strip footing only', optionB: 'Square footing only', optionC: 'Circular footing only', optionD: 'All of the above', correctAnswer: 'A', explanation: "Terzaghi's equation was originally derived for strip footings. He later modified it for square and circular shapes.", difficulty: 'hard', marks: 1, createdBy: adminId, status: 'published' },

    // Surveying
    { subject: 'Surveying', topic: 'Levelling', questionText: 'The first reading taken after setting up a level is called:', optionA: 'Fore sight', optionB: 'Back sight', optionC: 'Intermediate sight', optionD: 'Change point', correctAnswer: 'B', explanation: 'The first reading taken on a point of known elevation (benchmark) after setting up the instrument is the Back Sight (BS).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    
    // Fluid Mechanics
    { subject: 'Fluid Mechanics', topic: 'Fluid Properties', questionText: 'An ideal fluid is defined as:', optionA: 'Incompressible and viscous', optionB: 'Compressible and viscous', optionC: 'Incompressible and inviscid', optionD: 'Compressible and inviscid', correctAnswer: 'C', explanation: 'An ideal fluid is assumed to be incompressible (density constant) and inviscid (viscosity is zero).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    
    // Construction Management
    { subject: 'Construction Management', topic: 'CPM/PERT', questionText: 'In CPM, the critical path is the path with:', optionA: 'Maximum duration', optionB: 'Minimum duration', optionC: 'Zero float', optionD: 'Both A and C', correctAnswer: 'D', explanation: 'The critical path is the longest path in the network and has zero float (slack) for all its activities.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    
    // Environmental Engineering
    { subject: 'Environmental Engineering', topic: 'Water Quality', questionText: 'The standard time and temperature for BOD test is:', optionA: '3 days at 27°C', optionB: '5 days at 20°C', optionC: '7 days at 25°C', optionD: '1 day at 30°C', correctAnswer: 'B', explanation: 'Standard BOD is determined at 20°C for a period of 5 days (BOD5).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
  ];

  for (const q of questions) {
    const existing = await prisma.civilQuestion.findFirst({
      where: { subject: q.subject, questionText: q.questionText },
    });
    if (!existing) {
      await prisma.civilQuestion.create({ data: q });
    }
  }
  console.log(`  ✅ ${questions.length} Civil Engineering questions seeded`);

  console.log('\n✅ Civil Engineering seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

