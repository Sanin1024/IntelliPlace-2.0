import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Mechanical Engineering data...');

  // ============================================================
  // ENGINEERING SUBJECTS
  // ============================================================
  const subjects = [
    { name: 'Engineering Mechanics', code: 'ME101', category: 'Fundamentals' },
    { name: 'Strength of Materials', code: 'ME201', category: 'Design' },
    { name: 'Theory of Machines', code: 'ME202', category: 'Design' },
    { name: 'Machine Design', code: 'ME301', category: 'Design' },
    { name: 'Thermodynamics', code: 'ME203', category: 'Thermal' },
    { name: 'Fluid Mechanics', code: 'ME204', category: 'Thermal' },
    { name: 'Heat Transfer', code: 'ME302', category: 'Thermal' },
    { name: 'Manufacturing Technology', code: 'ME205', category: 'Manufacturing' },
    { name: 'Production Engineering', code: 'ME303', category: 'Manufacturing' },
    { name: 'Engineering Materials', code: 'ME206', category: 'Materials' },
    { name: 'Metrology & Measurements', code: 'ME304', category: 'Quality' },
    { name: 'Industrial Engineering', code: 'ME305', category: 'Industrial' },
    { name: 'Automobile Engineering', code: 'ME306', category: 'Automotive' },
    { name: 'CAD/CAM/CAE', code: 'ME307', category: 'Design' },
    { name: 'Robotics & Automation', code: 'ME308', category: 'Automation' },
    { name: 'Refrigeration & Air Conditioning', code: 'ME309', category: 'Thermal' },
    { name: 'Power Plant Engineering', code: 'ME310', category: 'Energy' },
  ];

  for (const s of subjects) {
    await prisma.engineeringSubject.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${subjects.length} Engineering subjects seeded`);

  // ============================================================
  // CAREER TRACKS
  // ============================================================
  const careerTracks: any[] = [
    {
      name: 'Design & Product Development Engineer',
      trackType: 'design_engineer',
      description: 'CAD modelling, machine design, FEA, and product development.',
      targetRoles: ['Design Engineer', 'Product Engineer', 'R&D Engineer'],
      requiredSkills: ['CAD Modelling', 'GD&T', 'Machine Design', 'FEA', 'Material Selection'],
      recommendedSoftware: ['SOLIDWORKS', 'AutoCAD', 'ANSYS', 'CATIA'],
    },
    {
      name: 'Production & Manufacturing Engineer',
      trackType: 'production_engineer',
      description: 'Manufacturing processes, CNC, production planning, lean manufacturing.',
      targetRoles: ['Production Engineer', 'Manufacturing Engineer', 'Process Engineer'],
      requiredSkills: ['CNC Programming', 'Production Planning', 'Lean Manufacturing', '5S', 'Kaizen'],
      recommendedSoftware: ['ERP Systems', 'CAM Software', 'Minitab'],
    },
    {
      name: 'Quality Engineer',
      trackType: 'quality_engineer',
      description: 'QA/QC, SPC, FMEA, ISO 9001, root cause analysis.',
      targetRoles: ['Quality Engineer', 'QA Engineer', 'QC Inspector'],
      requiredSkills: ['SPC', 'FMEA', '7 QC Tools', 'ISO 9001', 'Root Cause Analysis'],
      recommendedSoftware: ['Minitab', 'Excel', 'ERP Quality Modules'],
    },
    {
      name: 'Thermal & HVAC Engineer',
      trackType: 'thermal_hvac_engineer',
      description: 'Thermodynamics, HVAC design, heat exchangers, energy systems.',
      targetRoles: ['HVAC Engineer', 'Thermal Engineer', 'Energy Auditor'],
      requiredSkills: ['Thermodynamics', 'Heat Transfer', 'HVAC Design', 'Energy Auditing'],
      recommendedSoftware: ['ANSYS Fluent', 'HAP', 'EnergyPlus'],
    },
    {
      name: 'Automotive & EV Engineer',
      trackType: 'automotive_ev_engineer',
      description: 'IC engines, vehicle dynamics, EV architecture, battery systems.',
      targetRoles: ['Automotive Engineer', 'EV Engineer', 'Powertrain Engineer'],
      requiredSkills: ['IC Engines', 'Vehicle Dynamics', 'EV Architecture', 'Battery Systems'],
      recommendedSoftware: ['MATLAB', 'Simulink', 'ANSYS', 'LS-DYNA'],
    },
    {
      name: 'Automation & Robotics Engineer',
      trackType: 'automation_robotics_engineer',
      description: 'PLC programming, industrial robotics, pneumatics, control systems.',
      targetRoles: ['Automation Engineer', 'Robotics Engineer', 'PLC Programmer'],
      requiredSkills: ['PLC Programming', 'Robotics', 'Pneumatics', 'Control Systems'],
      recommendedSoftware: ['TIA Portal', 'RSLogix', 'MATLAB', 'RobotStudio'],
    },
    {
      name: 'Maintenance & Reliability Engineer',
      trackType: 'maintenance_engineer',
      description: 'Preventive/predictive maintenance, TPM, condition monitoring.',
      targetRoles: ['Maintenance Engineer', 'Reliability Engineer', 'Plant Engineer'],
      requiredSkills: ['TPM', 'Vibration Analysis', 'Condition Monitoring', 'CMMS'],
      recommendedSoftware: ['CMMS Software', 'Vibration Analyzers', 'ERP'],
    },
    {
      name: 'CAE & Simulation Engineer',
      trackType: 'cae_simulation_engineer',
      description: 'FEA, CFD, meshing, structural and thermal analysis.',
      targetRoles: ['CAE Engineer', 'Simulation Engineer', 'Analysis Engineer'],
      requiredSkills: ['FEA', 'CFD', 'Meshing', 'Boundary Conditions', 'Design Optimization'],
      recommendedSoftware: ['ANSYS', 'Abaqus', 'Hypermesh', 'OpenFOAM'],
    },
  ];

  for (const t of careerTracks) {
    await prisma.careerTrack.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`  ✅ ${careerTracks.length} Career tracks seeded`);

  // ============================================================
  // ENGINEERING SOFTWARE
  // ============================================================
  const software = [
    { name: 'AutoCAD', category: 'CAD', vendor: 'Autodesk', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/education', supportedFormats: ['DWG', 'DXF'], careerTracks: ['design_engineer', 'production_engineer'], difficulty: 'beginner' },
    { name: 'SOLIDWORKS', category: 'CAD', vendor: 'Dassault Systèmes', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.solidworks.com/learn', supportedFormats: ['SLDPRT', 'SLDASM', 'STEP'], careerTracks: ['design_engineer', 'cae_simulation_engineer'], difficulty: 'intermediate' },
    { name: 'CATIA', category: 'CAD', vendor: 'Dassault Systèmes', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.3ds.com/edu', supportedFormats: ['CATPart', 'STEP'], careerTracks: ['design_engineer', 'automotive_ev_engineer'], difficulty: 'advanced' },
    { name: 'ANSYS', category: 'CAE', vendor: 'Ansys', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.ansys.com/academic', supportedFormats: ['DB', 'WBPJ'], careerTracks: ['cae_simulation_engineer', 'thermal_hvac_engineer'], difficulty: 'advanced' },
    { name: 'MATLAB', category: 'Programming', vendor: 'MathWorks', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.mathworks.com/learn', supportedFormats: ['M', 'MAT'], careerTracks: ['automation_robotics_engineer', 'automotive_ev_engineer'], difficulty: 'intermediate' },
    { name: 'FreeCAD', category: 'CAD', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.freecad.org', supportedFormats: ['FCStd', 'STEP'], careerTracks: ['design_engineer'], difficulty: 'beginner' },
    { name: 'OpenFOAM', category: 'CAE', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.openfoam.com', supportedFormats: ['FOAM'], careerTracks: ['cae_simulation_engineer', 'thermal_hvac_engineer'], difficulty: 'advanced' },
    { name: 'Siemens NX', category: 'CAD', vendor: 'Siemens', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.plm.automation.siemens.com', supportedFormats: ['PRT', 'STEP'], careerTracks: ['design_engineer', 'production_engineer'], difficulty: 'advanced' },
    { name: 'Fusion 360', category: 'CAD', vendor: 'Autodesk', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/products/fusion-360', supportedFormats: ['F3D', 'STEP'], careerTracks: ['design_engineer'], difficulty: 'intermediate' },
    { name: 'Abaqus', category: 'CAE', vendor: 'Dassault Systèmes', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.3ds.com/products-services/simulia', supportedFormats: ['CAE', 'INP'], careerTracks: ['cae_simulation_engineer'], difficulty: 'advanced' },
  ];

  for (const s of software) {
    await prisma.engineeringSoftware.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${software.length} Engineering software seeded`);

  // ============================================================
  // COMPANY PROFILES
  // ============================================================
  const companies = [
    {
      companyName: 'Tata Motors',
      industry: 'Automotive',
      officialUrl: 'https://www.tatamotors.com',
      careersUrl: 'https://www.tatamotors.com/careers',
      description: 'Leading automobile manufacturer in India.',
      relevantRoles: ['Graduate Engineer Trainee', 'Design Engineer', 'Production Engineer'],
      requiredSkills: ['AutoCAD', 'CATIA', 'Manufacturing Processes', 'GD&T'],
      preferredSoftware: ['CATIA', 'AutoCAD', 'ANSYS'],
      relevantSubjects: ['Automobile Engineering', 'Machine Design', 'Manufacturing Technology'],
      interviewAreas: ['Automobile Engineering', 'IC Engines', 'Manufacturing', 'Strength of Materials'],
    },
    {
      companyName: 'Larsen & Toubro',
      industry: 'Manufacturing',
      officialUrl: 'https://www.larsentoubro.com',
      careersUrl: 'https://www.larsentoubro.com/careers',
      description: 'Indian multinational engaged in engineering, construction, manufacturing.',
      relevantRoles: ['GET', 'Design Engineer', 'Site Engineer'],
      requiredSkills: ['AutoCAD', 'SolidWorks', 'Manufacturing', 'Project Management'],
      preferredSoftware: ['AutoCAD', 'SolidWorks', 'ANSYS'],
      relevantSubjects: ['Machine Design', 'Manufacturing Technology', 'Industrial Engineering'],
      interviewAreas: ['Machine Design', 'Manufacturing', 'Thermodynamics', 'Strength of Materials'],
    },
    {
      companyName: 'Siemens',
      industry: 'Manufacturing',
      officialUrl: 'https://www.siemens.com',
      careersUrl: 'https://www.siemens.com/careers',
      description: 'Global technology company focused on industry, energy, healthcare.',
      relevantRoles: ['Automation Engineer', 'Design Engineer', 'GET'],
      requiredSkills: ['PLC Programming', 'Automation', 'CAD'],
      preferredSoftware: ['Siemens NX', 'TIA Portal'],
      relevantSubjects: ['Robotics & Automation', 'Machine Design', 'Industrial Engineering'],
      interviewAreas: ['Automation', 'Control Systems', 'Manufacturing'],
    },
    {
      companyName: 'BHEL',
      industry: 'Energy',
      officialUrl: 'https://www.bhel.com',
      careersUrl: 'https://www.bhel.com/careers',
      description: 'Bharat Heavy Electricals Limited - power plant equipment manufacturer.',
      relevantRoles: ['GET', 'Design Engineer', 'Thermal Engineer'],
      requiredSkills: ['Thermodynamics', 'Heat Transfer', 'AutoCAD'],
      preferredSoftware: ['AutoCAD', 'ANSYS'],
      relevantSubjects: ['Power Plant Engineering', 'Thermodynamics', 'Heat Transfer'],
      interviewAreas: ['Thermodynamics', 'Heat Transfer', 'Fluid Mechanics'],
    },
    {
      companyName: 'Mahindra & Mahindra',
      industry: 'Automotive',
      officialUrl: 'https://www.mahindra.com',
      careersUrl: 'https://careers.mahindra.com',
      description: 'Automotive, farm equipment, and technology conglomerate.',
      relevantRoles: ['GET', 'Design Engineer', 'Quality Engineer'],
      requiredSkills: ['CATIA', 'GD&T', 'Manufacturing', 'Quality Control'],
      preferredSoftware: ['CATIA', 'ANSYS'],
      relevantSubjects: ['Automobile Engineering', 'Machine Design', 'Manufacturing Technology'],
      interviewAreas: ['Automobile Engineering', 'Machine Design', 'Manufacturing'],
    },
    {
      companyName: 'Cummins India',
      industry: 'Automotive',
      officialUrl: 'https://www.cummins.com',
      careersUrl: 'https://www.cummins.com/careers',
      description: 'Designer and manufacturer of power generation and engine technologies.',
      relevantRoles: ['GET', 'Design Engineer', 'Thermal Engineer'],
      requiredSkills: ['IC Engines', 'Thermodynamics', 'CAD'],
      preferredSoftware: ['Pro/E', 'ANSYS'],
      relevantSubjects: ['Automobile Engineering', 'Thermodynamics', 'Heat Transfer'],
      interviewAreas: ['IC Engines', 'Thermodynamics', 'Machine Design'],
    },
  ];

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin ? admin.id : 'system';

  for (const c of companies) {
    await prisma.mechanicalCompanyProfile.upsert({
      where: { companyName: c.companyName },
      update: {},
      create: { ...c, createdBy: adminId, isVerified: true, lastVerifiedAt: new Date() },
    });
  }
  console.log(`  ✅ ${companies.length} Company profiles seeded`);

  // ============================================================
  // SAMPLE MECHANICAL QUESTIONS
  // ============================================================
  const somSubject = await prisma.engineeringSubject.findUnique({ where: { code: 'ME201' } });
  const thermoSubject = await prisma.engineeringSubject.findUnique({ where: { code: 'ME203' } });
  const fluidSubject = await prisma.engineeringSubject.findUnique({ where: { code: 'ME204' } });
  const designSubject = await prisma.engineeringSubject.findUnique({ where: { code: 'ME301' } });
  const manufacturingSubject = await prisma.engineeringSubject.findUnique({ where: { code: 'ME205' } });

  const questions = [
    // Strength of Materials
    { subjectId: somSubject!.id, topic: 'Stress & Strain', questionText: 'The ratio of lateral strain to longitudinal strain is called:', optionA: 'Modulus of elasticity', optionB: 'Modulus of rigidity', optionC: "Poisson's ratio", optionD: 'Bulk modulus', correctAnswer: 'C', explanation: "Poisson's ratio is defined as the ratio of lateral strain to longitudinal strain.", difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: somSubject!.id, topic: 'Stress & Strain', questionText: 'The maximum stress that a material can withstand without permanent deformation is called:', optionA: 'Ultimate stress', optionB: 'Yield stress', optionC: 'Working stress', optionD: 'Breaking stress', correctAnswer: 'B', explanation: 'Yield stress is the stress at which a material begins to deform plastically.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: somSubject!.id, topic: 'Bending', questionText: 'In a simply supported beam carrying a point load at the center, the maximum bending moment occurs at:', optionA: 'Supports', optionB: 'Center', optionC: 'Quarter span', optionD: 'Everywhere', correctAnswer: 'B', explanation: 'For a simply supported beam with central point load W, max BM = WL/4 at the center.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: somSubject!.id, topic: 'Torsion', questionText: 'The torsional shear stress in a circular shaft is maximum at:', optionA: 'Center of the shaft', optionB: 'Outer surface', optionC: 'Mid-radius', optionD: 'Quarter radius', correctAnswer: 'B', explanation: 'Torsional shear stress is proportional to the radius, so it is maximum at the outer surface.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: somSubject!.id, topic: 'Columns', questionText: "Euler's formula for buckling load is valid for:", optionA: 'Short columns', optionB: 'Long columns', optionC: 'Medium columns', optionD: 'All columns', correctAnswer: 'B', explanation: "Euler's formula is applicable for long columns where failure occurs due to buckling.", difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Thermodynamics
    { subjectId: thermoSubject!.id, topic: 'Laws of Thermodynamics', questionText: 'The first law of thermodynamics is based on the conservation of:', optionA: 'Momentum', optionB: 'Energy', optionC: 'Mass', optionD: 'Entropy', correctAnswer: 'B', explanation: 'The first law states that energy cannot be created or destroyed, only transformed.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: thermoSubject!.id, topic: 'Entropy', questionText: 'For a reversible adiabatic process, the change in entropy is:', optionA: 'Positive', optionB: 'Negative', optionC: 'Zero', optionD: 'Infinite', correctAnswer: 'C', explanation: 'A reversible adiabatic process is isentropic, meaning ΔS = 0.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: thermoSubject!.id, topic: 'Heat Engines', questionText: 'The efficiency of a Carnot engine depends on:', optionA: 'Working substance', optionB: 'Source temperature only', optionC: 'Sink temperature only', optionD: 'Source and sink temperatures', correctAnswer: 'D', explanation: 'η = 1 - T_sink/T_source, so it depends on both temperatures.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: thermoSubject!.id, topic: 'Properties', questionText: 'The specific heat at constant pressure (Cp) is always _______ the specific heat at constant volume (Cv):', optionA: 'Less than', optionB: 'Equal to', optionC: 'Greater than', optionD: 'Unrelated to', correctAnswer: 'C', explanation: 'Cp = Cv + R, so Cp is always greater than Cv.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Fluid Mechanics
    { subjectId: fluidSubject!.id, topic: 'Fluid Properties', questionText: 'The viscosity of a liquid _______ with increasing temperature:', optionA: 'Increases', optionB: 'Decreases', optionC: 'Remains constant', optionD: 'First increases then decreases', correctAnswer: 'B', explanation: 'In liquids, viscosity decreases with temperature due to reduced intermolecular forces.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: fluidSubject!.id, topic: 'Bernoulli Equation', questionText: "Bernoulli's equation is based on the conservation of:", optionA: 'Mass', optionB: 'Momentum', optionC: 'Energy', optionD: 'Force', correctAnswer: 'C', explanation: "Bernoulli's equation is an energy conservation equation for fluid flow.", difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: fluidSubject!.id, topic: 'Flow Types', questionText: 'Reynolds number is the ratio of:', optionA: 'Inertia force to viscous force', optionB: 'Inertia force to gravity force', optionC: 'Pressure force to viscous force', optionD: 'Viscous force to gravity force', correctAnswer: 'A', explanation: 'Re = ρVD/μ = Inertia force / Viscous force.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Machine Design
    { subjectId: designSubject!.id, topic: 'Factor of Safety', questionText: 'Factor of safety is defined as the ratio of:', optionA: 'Working stress to ultimate stress', optionB: 'Ultimate stress to working stress', optionC: 'Yield stress to ultimate stress', optionD: 'Working stress to yield stress', correctAnswer: 'B', explanation: 'FoS = Ultimate stress / Working stress (or Yield stress / Working stress for ductile materials).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: designSubject!.id, topic: 'Fatigue', questionText: 'Fatigue failure occurs due to:', optionA: 'Static loading', optionB: 'Fluctuating loading', optionC: 'Impact loading', optionD: 'Thermal loading', correctAnswer: 'B', explanation: 'Fatigue failure occurs under repeated or fluctuating loads at stress levels below the yield strength.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Manufacturing
    { subjectId: manufacturingSubject!.id, topic: 'Machining', questionText: 'In a lathe machine, the cutting speed is measured in:', optionA: 'mm/min', optionB: 'm/min', optionC: 'rpm', optionD: 'mm/rev', correctAnswer: 'B', explanation: 'Cutting speed is the peripheral speed of the workpiece relative to the tool, measured in m/min.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: manufacturingSubject!.id, topic: 'Casting', questionText: 'In sand casting, the pattern is made _______ the actual casting:', optionA: 'Smaller than', optionB: 'Larger than', optionC: 'Equal to', optionD: 'Unrelated to', correctAnswer: 'B', explanation: 'The pattern is made larger to account for shrinkage allowance during solidification.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subjectId: manufacturingSubject!.id, topic: 'Welding', questionText: 'In arc welding, the electrode is coated to:', optionA: 'Increase conductivity', optionB: 'Provide shielding gas', optionC: 'Reduce oxidation', optionD: 'Both B and C', correctAnswer: 'D', explanation: 'The coating provides shielding gas and flux to protect the weld pool from oxidation.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
  ];

  for (const q of questions) {
    const existing = await prisma.mechanicalQuestion.findFirst({
      where: { subjectId: q.subjectId, questionText: q.questionText }
    });
    if (!existing) {
      await prisma.mechanicalQuestion.create({ data: q });
    }
  }
  console.log(`  ✅ ${questions.length} Mechanical questions seeded`);

  // ============================================================
  // ENGINEERING PROJECTS
  // ============================================================
  const projects = [
    {
      title: 'Design and Analysis of a Heat Exchanger',
      problemStatement: 'Design a shell-and-tube heat exchanger for a given thermal duty and perform thermal analysis to verify performance.',
      domain: 'Thermal',
      skillsInvolved: ['Heat Transfer', 'Thermodynamics', 'ANSYS'],
      requiredSoftware: ['ANSYS', 'AutoCAD'],
      difficulty: 'advanced',
      expectedDeliverables: ['3D Model', 'Thermal Analysis Report', 'Design Calculations'],
      methodology: '1. Calculate heat duty. 2. Determine LMTD. 3. Calculate required area. 4. Design geometry. 5. Run CFD simulation.',
      estimatedDurationWeeks: 4,
      createdBy: adminId,
    },
    {
      title: 'CNC Tool Wear Prediction',
      problemStatement: 'Analyze CNC tool wear data and build a predictive maintenance model.',
      domain: 'Manufacturing',
      skillsInvolved: ['Manufacturing', 'Data Analysis', 'Python'],
      requiredSoftware: ['Python', 'MATLAB'],
      difficulty: 'intermediate',
      expectedDeliverables: ['Data Analysis Report', 'Prediction Model', 'Technical Presentation'],
      methodology: '1. Collect vibration data. 2. Preprocess signals. 3. Extract features. 4. Train ML model. 5. Evaluate.',
      estimatedDurationWeeks: 3,
      createdBy: adminId,
    },
    {
      title: 'HVAC Energy Optimization',
      problemStatement: 'Analyze an HVAC system and propose energy optimization strategies.',
      domain: 'Thermal',
      skillsInvolved: ['HVAC', 'Energy Auditing', 'Thermodynamics'],
      requiredSoftware: ['HAP', 'EnergyPlus'],
      difficulty: 'intermediate',
      expectedDeliverables: ['Energy Audit Report', 'Optimization Proposal', 'Cost-Benefit Analysis'],
      methodology: '1. Survey building. 2. Calculate cooling loads. 3. Analyze current system. 4. Propose improvements.',
      estimatedDurationWeeks: 3,
      createdBy: adminId,
    },
    {
      title: 'EV Battery Thermal Management',
      problemStatement: 'Design a thermal management system for an EV battery pack to maintain optimal operating temperature.',
      domain: 'Automotive',
      skillsInvolved: ['Heat Transfer', 'CFD', 'Battery Systems'],
      requiredSoftware: ['ANSYS Fluent', 'SolidWorks'],
      difficulty: 'advanced',
      expectedDeliverables: ['Design Report', 'CFD Analysis', 'Temperature Distribution Plots'],
      methodology: '1. Define battery specs. 2. Design cooling channels. 3. Mesh the model. 4. Run transient CFD. 5. Analyze.',
      estimatedDurationWeeks: 5,
      createdBy: adminId,
    },
    {
      title: 'Lightweight Component Design',
      problemStatement: 'Redesign a mechanical component to reduce weight while maintaining structural integrity using topology optimization.',
      domain: 'Design',
      skillsInvolved: ['CAD Modelling', 'FEA', 'Topology Optimization'],
      requiredSoftware: ['SolidWorks', 'ANSYS'],
      difficulty: 'advanced',
      expectedDeliverables: ['Original vs Optimized Model', 'FEA Report', 'Weight Reduction Report'],
      methodology: '1. Analyze current design. 2. Define load cases. 3. Apply topology optimization. 4. Verify with FEA.',
      estimatedDurationWeeks: 4,
      createdBy: adminId,
    },
  ];

  for (const p of projects) {
    const existing = await prisma.engineeringProject.findFirst({
      where: { title: p.title }
    });
    if (!existing) {
      await prisma.engineeringProject.create({ data: p });
    }
  }
  console.log(`  ✅ ${projects.length} Engineering projects seeded`);

  console.log('\n✅ Mechanical Engineering seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

