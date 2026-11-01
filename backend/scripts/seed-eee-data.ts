import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Electrical and Electronics Engineering data...');

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin ? admin.id : 'system';

  // ============================================================
  // EEE CAREER TRACKS
  // ============================================================
  const careerTracks: any[] = [
    { name: 'Electrical Design Engineer', trackType: 'design_engineer', description: 'Electrical system design, load calculations, cable sizing, switchgear selection.', targetRoles: ['Electrical Design Engineer', 'Electrical Consultant'], requiredSkills: ['Load Calculations', 'Cable Sizing', 'Switchgear Selection', 'AutoCAD Electrical', 'Earthing Design'], recommendedSoftware: ['AutoCAD Electrical', 'EPLAN', 'ETAP', 'Dialux'] },
    { name: 'Power Systems Engineer', trackType: 'production_engineer', description: 'Power generation, transmission, distribution, load flow, fault analysis.', targetRoles: ['Power Systems Engineer', 'Grid Operations Engineer'], requiredSkills: ['Load Flow Analysis', 'Fault Analysis', 'Power System Stability', 'Protection Coordination'], recommendedSoftware: ['ETAP', 'PowerFactory', 'PSS/E', 'MATLAB'] },
    { name: 'Electrical Machines and Drives Engineer', trackType: 'quality_engineer', description: 'Transformers, induction motors, synchronous machines, VFDs, motor control.', targetRoles: ['Machine Design Engineer', 'Drives Engineer', 'Motor Engineer'], requiredSkills: ['Transformer Analysis', 'Induction Motors', 'VFDs', 'Motor Testing', 'Machine Efficiency'], recommendedSoftware: ['MATLAB', 'Simulink', 'ANSYS Maxwell'] },
    { name: 'Power Electronics Engineer', trackType: 'cae_simulation_engineer', description: 'Converters, inverters, PWM, power semiconductor devices.', targetRoles: ['Power Electronics Engineer', 'Converter Design Engineer'], requiredSkills: ['Rectifiers', 'Inverters', 'DC-DC Converters', 'PWM Techniques', 'SPICE Simulation'], recommendedSoftware: ['LTspice', 'PLECS', 'MATLAB', 'PSIM'] },
    { name: 'Renewable Energy Engineer', trackType: 'thermal_hvac_engineer', description: 'Solar PV, wind energy, MPPT, battery storage, grid integration.', targetRoles: ['Solar Engineer', 'Wind Energy Engineer', 'Renewable Energy Consultant'], requiredSkills: ['Solar PV Systems', 'MPPT', 'Wind Energy', 'Battery Storage', 'Grid Integration'], recommendedSoftware: ['PVsyst', 'HOMER', 'SAM', 'MATLAB'] },
    { name: 'Industrial Automation and Control Engineer', trackType: 'automation_robotics_engineer', description: 'PLC programming, SCADA, sensors, actuators, process automation.', targetRoles: ['Automation Engineer', 'PLC Programmer', 'SCADA Engineer'], requiredSkills: ['PLC Programming', 'Ladder Logic', 'SCADA', 'Industrial Sensors', 'HMI'], recommendedSoftware: ['TIA Portal', 'RSLogix', 'SCADA Software', 'MATLAB'] },
    { name: 'Electric Vehicle and Battery Engineer', trackType: 'maintenance_engineer', description: 'EV architecture, traction motors, BMS, charging infrastructure.', targetRoles: ['EV Engineer', 'Battery Systems Engineer', 'Powertrain Engineer'], requiredSkills: ['EV Architecture', 'Traction Motors', 'Battery Management', 'Charging Systems', 'Regenerative Braking'], recommendedSoftware: ['MATLAB', 'Simulink', 'PLECS'] },
    { name: 'Electrical Testing and Commissioning Engineer', trackType: 'project_field_engineer', description: 'Equipment testing, relay testing, commissioning, quality assurance.', targetRoles: ['Testing Engineer', 'Commissioning Engineer', 'QA Engineer'], requiredSkills: ['Transformer Testing', 'Relay Testing', 'Insulation Testing', 'Commissioning Procedures', 'Test Reports'], recommendedSoftware: ['Omicron Test Software', 'MATLAB', 'Excel'] },
  ];

  for (const t of careerTracks) {
    await prisma.careerTrack.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`  ✅ ${careerTracks.length} EEE Career tracks seeded`);

  // ============================================================
  // EEE ENGINEERING SOFTWARE
  // ============================================================
  const software: any[] = [
    { name: 'MATLAB', category: 'Analysis', vendor: 'MathWorks', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.mathworks.com/learn', supportedFormats: ['M', 'MAT'], careerTracks: ['production_engineer', 'quality_engineer', 'cae_simulation_engineer', 'thermal_hvac_engineer', 'automation_robotics_engineer', 'maintenance_engineer'], difficulty: 'intermediate' },
    { name: 'Simulink', category: 'Simulation', vendor: 'MathWorks', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.mathworks.com/products/simulink.html', supportedFormats: ['SLX'], careerTracks: ['cae_simulation_engineer', 'maintenance_engineer', 'automation_robotics_engineer'], difficulty: 'intermediate' },
    { name: 'ETAP', category: 'Power Systems', vendor: 'ETAP', isFree: false, hasStudentLicense: false, learningUrl: 'https://etap.com', supportedFormats: ['ETAP'], careerTracks: ['production_engineer', 'design_engineer'], difficulty: 'advanced' },
    { name: 'AutoCAD Electrical', category: 'CAD', vendor: 'Autodesk', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.autodesk.com/products/autocad/included-toolsets/autocad-electrical', supportedFormats: ['DWG', 'DWT'], careerTracks: ['design_engineer'], difficulty: 'intermediate' },
    { name: 'LTspice', category: 'Simulation', vendor: 'Analog Devices', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html', supportedFormats: ['ASC'], careerTracks: ['cae_simulation_engineer'], difficulty: 'intermediate' },
    { name: 'PVsyst', category: 'Solar', vendor: 'PVsyst', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.pvsyst.com', supportedFormats: ['PVC'], careerTracks: ['thermal_hvac_engineer'], difficulty: 'intermediate' },
    { name: 'HOMER Energy', category: 'Renewable', vendor: 'UL Solutions', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.homerenergy.com', supportedFormats: ['HOMER'], careerTracks: ['thermal_hvac_engineer'], difficulty: 'intermediate' },
    { name: 'PLECS', category: 'Simulation', vendor: 'Plexim', isFree: false, hasStudentLicense: true, learningUrl: 'https://www.plexim.com', supportedFormats: ['PLECS'], careerTracks: ['cae_simulation_engineer', 'maintenance_engineer'], difficulty: 'advanced' },
    { name: 'OpenDSS', category: 'Power Systems', vendor: 'EPRI', isFree: true, hasStudentLicense: true, learningUrl: 'https://opendss.epri.com', supportedFormats: ['DSS'], careerTracks: ['production_engineer'], difficulty: 'advanced' },
    { name: 'EPLAN', category: 'CAD', vendor: 'EPLAN', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.eplan.com', supportedFormats: ['ELK'], careerTracks: ['design_engineer'], difficulty: 'advanced' },
    { name: 'TIA Portal', category: 'Automation', vendor: 'Siemens', isFree: false, hasStudentLicense: false, learningUrl: 'https://www.siemens.com/global/en/products/automation/industry-software/automation-software/tia-portal.html', supportedFormats: ['AP16'], careerTracks: ['automation_robotics_engineer'], difficulty: 'intermediate' },
  ];

  for (const s of software) {
    await prisma.engineeringSoftware.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${software.length} EEE software resources seeded`);

  // ============================================================
  // EEE COMPANY PROFILES
  // ============================================================
  const companies: any[] = [
    {
      companyName: 'NTPC',
      industry: 'Power Generation',
      officialUrl: 'https://www.ntpc.co.in',
      careersUrl: 'https://www.ntpc.co.in/careers',
      description: "India's largest power generation company.",
      relevantRoles: ['GET', 'Operations Engineer', 'Maintenance Engineer'],
      requiredSkills: ['Power Plant Operations', 'Electrical Maintenance', 'Boiler/Turbine Fundamentals'],
      preferredSoftware: ['SCADA', 'DCS', 'Excel'],
      relevantSubjects: ['Power Generation', 'Electrical Machines', 'Power Systems'],
      interviewAreas: ['Power Systems', 'Electrical Machines', 'Power Plant Operations', 'Switchgear'],
    },
    {
      companyName: 'Siemens',
      industry: 'Electrical Equipment',
      officialUrl: 'https://www.siemens.com',
      careersUrl: 'https://www.siemens.com/careers',
      description: 'Global technology company focused on industry, energy, and healthcare.',
      relevantRoles: ['Design Engineer', 'Automation Engineer', 'GET', 'Testing Engineer'],
      requiredSkills: ['AutoCAD', 'PLC Programming', 'Electrical Design', 'Testing'],
      preferredSoftware: ['TIA Portal', 'AutoCAD Electrical', 'ETAP'],
      relevantSubjects: ['Electrical Machines', 'Power Electronics', 'Industrial Automation', 'Control Systems'],
      interviewAreas: ['Electrical Machines', 'Automation', 'Power Electronics', 'Control Systems'],
    },
    {
      companyName: 'ABB',
      industry: 'Electrical Equipment',
      officialUrl: 'https://global.abb',
      careersUrl: 'https://global.abb/careers',
      description: 'Leading global technology company in electrification and automation.',
      relevantRoles: ['Design Engineer', 'R&D Engineer', 'GET', 'Testing Engineer'],
      requiredSkills: ['Electrical Design', 'Power Electronics', 'Automation', 'Drives'],
      preferredSoftware: ['MATLAB', 'AutoCAD', 'PLC Software'],
      relevantSubjects: ['Power Electronics', 'Electrical Machines', 'Control Systems', 'Drives'],
      interviewAreas: ['Power Electronics', 'Electrical Machines', 'Drives', 'Control Systems'],
    },
    {
      companyName: 'Schneider Electric',
      industry: 'Electrical Equipment',
      officialUrl: 'https://www.se.com',
      careersUrl: 'https://careers.se.com',
      description: 'Global leader in digital automation and energy management.',
      relevantRoles: ['Design Engineer', 'GET', 'Product Engineer', 'QA Engineer'],
      requiredSkills: ['Electrical Design', 'Power Distribution', 'Automation', 'Quality'],
      preferredSoftware: ['EPLAN', 'AutoCAD Electrical', 'MATLAB'],
      relevantSubjects: ['Switchgear', 'Power Systems', 'Electrical Installation', 'Automation'],
      interviewAreas: ['Switchgear', 'Power Distribution', 'Electrical Design', 'Automation'],
    },
    {
      companyName: 'BHEL',
      industry: 'Government',
      officialUrl: 'https://www.bhel.com',
      careersUrl: 'https://www.bhel.com/careers',
      description: 'Bharat Heavy Electricals Limited - power plant equipment manufacturer.',
      relevantRoles: ['GET', 'Design Engineer', 'Testing Engineer', 'Production Engineer'],
      requiredSkills: ['Electrical Machines', 'Power Systems', 'Manufacturing', 'Testing'],
      preferredSoftware: ['AutoCAD', 'MATLAB'],
      relevantSubjects: ['Electrical Machines', 'Power Systems', 'Power Electronics', 'Transformers'],
      interviewAreas: ['Electrical Machines', 'Transformers', 'Power Systems', 'Power Electronics'],
    },
    {
      companyName: 'Tata Power Solar',
      industry: 'Renewable Energy',
      officialUrl: 'https://www.tatapowersolar.com',
      careersUrl: 'https://www.tatapowersolar.com/careers',
      description: 'Leading solar energy and EPC services company.',
      relevantRoles: ['Solar Design Engineer', 'GET', 'Project Engineer'],
      requiredSkills: ['Solar PV Systems', 'System Design', 'Energy Estimation', 'AutoCAD'],
      preferredSoftware: ['PVsyst', 'AutoCAD', 'SAM'],
      relevantSubjects: ['Renewable Energy', 'Solar PV Systems', 'Power Systems'],
      interviewAreas: ['Solar PV', 'Renewable Energy', 'Power Systems', 'Energy Storage'],
    },
    {
      companyName: 'Tata Motors',
      industry: 'EV',
      officialUrl: 'https://www.tatamotors.com',
      careersUrl: 'https://www.tatamotors.com/careers',
      description: 'Leading automobile manufacturer with EV and electric mobility divisions.',
      relevantRoles: ['EV Engineer', 'GET', 'Battery Systems Engineer', 'Powertrain Engineer'],
      requiredSkills: ['EV Architecture', 'Battery Management', 'Motor Drives', 'Power Electronics'],
      preferredSoftware: ['MATLAB', 'Simulink', 'PLECS'],
      relevantSubjects: ['Electric Vehicles', 'Power Electronics', 'Electrical Machines', 'Battery Systems'],
      interviewAreas: ['EV Systems', 'Battery Management', 'Motor Drives', 'Power Electronics'],
    },
    {
      companyName: 'L&T Technology Services',
      industry: 'Engineering Services',
      officialUrl: 'https://www.ltts.com',
      careersUrl: 'https://www.ltts.com/careers',
      description: 'Global engineering services company serving multiple industries.',
      relevantRoles: ['GET', 'Design Engineer', 'Automation Engineer', 'Testing Engineer'],
      requiredSkills: ['Electrical Design', 'PLC Programming', 'Testing', 'Simulation'],
      preferredSoftware: ['AutoCAD Electrical', 'EPLAN', 'MATLAB', 'TIA Portal'],
      relevantSubjects: ['Electrical Design', 'Industrial Automation', 'Power Systems', 'Control Systems'],
      interviewAreas: ['Electrical Design', 'Automation', 'Control Systems', 'Power Electronics'],
    },
  ];

  for (const c of companies) {
    await prisma.eEECompanyProfile.upsert({
      where: { companyName: c.companyName },
      update: {},
      create: { ...c, createdBy: adminId, isVerified: true, lastVerifiedAt: new Date() },
    });
  }
  console.log(`  ✅ ${companies.length} EEE Company profiles seeded`);

  // ============================================================
  // EEE TECHNICAL QUESTIONS
  // ============================================================
  const questions: any[] = [
    // Circuit Theory
    { subject: 'Circuit Theory', topic: 'Ohms Law', questionText: "Ohm's law states that the current through a conductor is directly proportional to:", optionA: 'Resistance', optionB: 'Voltage', optionC: 'Power', optionD: 'Temperature', correctAnswer: 'B', explanation: "Ohm's law: V = IR, so current (I) is directly proportional to voltage (V) for constant resistance.", difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Circuit Theory', topic: 'Kirchhoff Laws', questionText: "Kirchhoff's Current Law (KCL) is based on conservation of:", optionA: 'Energy', optionB: 'Momentum', optionC: 'Charge', optionD: 'Power', correctAnswer: 'C', explanation: 'KCL states that the sum of currents entering a node equals the sum leaving, based on conservation of charge.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Circuit Theory', topic: 'AC Circuits', questionText: 'In a purely inductive AC circuit, the current:', optionA: 'Leads voltage by 90°', optionB: 'Lags voltage by 90°', optionC: 'Is in phase with voltage', optionD: 'Is 180° out of phase', correctAnswer: 'B', explanation: 'In a purely inductive circuit, current lags voltage by 90° (π/2 radians). ELI the ICE man: E leads I in inductor (L).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Circuit Theory', topic: 'Power Factor', questionText: 'Power factor is defined as:', optionA: 'sin(θ)', optionB: 'tan(θ)', optionC: 'cos(θ)', optionD: 'cot(θ)', correctAnswer: 'C', explanation: 'Power factor = cos(θ), where θ is the phase angle between voltage and current.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Circuit Theory', topic: 'Resonance', questionText: 'At series resonance, the impedance of an RLC circuit is:', optionA: 'Maximum', optionB: 'Minimum', optionC: 'Zero', optionD: 'Infinite', correctAnswer: 'B', explanation: 'At series resonance, XL = XC, so they cancel out. Impedance = R (minimum), allowing maximum current.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Electrical Machines
    { subject: 'Transformers', topic: 'Basic Principles', questionText: 'A transformer works on the principle of:', optionA: "Lenz's law", optionB: "Faraday's law of electromagnetic induction", optionC: "Ampere's law", optionD: "Gauss's law", correctAnswer: 'B', explanation: 'Transformers operate on mutual induction, which is based on Faraday\'s law of electromagnetic induction.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Transformers', topic: 'Efficiency', questionText: 'Transformer maximum efficiency occurs when:', optionA: 'Iron losses = copper losses', optionB: 'Iron losses = 0', optionC: 'Copper losses = 0', optionD: 'Load is maximum', correctAnswer: 'A', explanation: 'Maximum efficiency occurs when variable copper losses equal constant iron (core) losses.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Induction Machines', topic: 'Slip', questionText: 'The slip of an induction motor at synchronous speed is:', optionA: '1', optionB: '0', optionC: '0.5', optionD: 'Infinite', correctAnswer: 'B', explanation: 'Slip s = (Ns - Nr)/Ns. At synchronous speed, Nr = Ns, so s = 0.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Induction Machines', topic: 'Starting', questionText: 'Star-delta starter is used to:', optionA: 'Increase starting torque', optionB: 'Reduce starting current', optionC: 'Improve efficiency', optionD: 'Increase speed', correctAnswer: 'B', explanation: 'Star-delta starter reduces starting current to 1/3 of direct-on-line (DOL) starting current by initially connecting in star.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'DC Machines', topic: 'Motors', questionText: 'The speed of a DC shunt motor can be controlled by:', optionA: 'Flux control', optionB: 'Armature voltage control', optionC: 'Both A and B', optionD: 'Neither A nor B', correctAnswer: 'C', explanation: 'Speed N ∝ Eb/φ. Speed can be controlled by varying flux (field control) or armature voltage (voltage control).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Power Systems
    { subject: 'Power Systems', topic: 'Transmission', questionText: 'The primary reason for using high voltage for long distance transmission is:', optionA: 'To increase power', optionB: 'To reduce I²R losses', optionC: 'To increase current', optionD: 'To improve power factor', correctAnswer: 'B', explanation: 'For same power, higher voltage means lower current, which reduces I²R line losses.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Systems', topic: 'Protection', questionText: 'The function of a Buchholz relay is to protect:', optionA: 'Induction motors', optionB: 'Transformers', optionC: 'Transmission lines', optionD: 'Generators', correctAnswer: 'B', explanation: 'Buchholz relay is a gas-actuated relay used for internal fault protection of oil-immersed transformers.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Systems', topic: 'Power Factor', questionText: 'The power factor of a purely resistive circuit is:', optionA: '0', optionB: '0.5', optionC: '0.707', optionD: '1', correctAnswer: 'D', explanation: 'In a purely resistive circuit, voltage and current are in phase, so θ = 0° and PF = cos(0°) = 1.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Systems', topic: 'Faults', questionText: 'The most common type of fault in a power system is:', optionA: 'Three-phase fault', optionB: 'Line-to-ground fault', optionC: 'Line-to-line fault', optionD: 'Double line-to-ground fault', correctAnswer: 'B', explanation: 'LG (line-to-ground) faults account for about 70-80% of all faults in power systems.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Systems', topic: 'Substations', questionText: 'An isolator in a substation is used to:', optionA: 'Break fault current', optionB: 'Make or break load current', optionC: 'Isolate equipment for maintenance', optionD: 'Measure voltage', correctAnswer: 'C', explanation: 'Isolators are off-load switches used to visibly isolate equipment for maintenance. They cannot break load or fault current.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Power Electronics
    { subject: 'Power Electronics', topic: 'Rectifiers', questionText: 'In a single-phase full-wave bridge rectifier, the ripple frequency is:', optionA: '50 Hz', optionB: '100 Hz', optionC: '150 Hz', optionD: '200 Hz', correctAnswer: 'B', explanation: 'For 50 Hz input, full-wave rectification produces ripples at 2×50 = 100 Hz.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Electronics', topic: 'Inverters', questionText: 'PWM (Pulse Width Modulation) in inverters is used to:', optionA: 'Increase voltage', optionB: 'Control output voltage and reduce harmonics', optionC: 'Reduce current', optionD: 'Increase frequency', correctAnswer: 'B', explanation: 'PWM controls the output voltage by varying pulse width and also helps reduce lower-order harmonics.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Power Electronics', topic: 'Converters', questionText: 'A chopper is a static device that converts:', optionA: 'AC to DC', optionB: 'DC to AC', optionC: 'DC to DC', optionD: 'AC to AC', correctAnswer: 'C', explanation: 'A chopper (DC-DC converter) converts fixed DC to variable DC voltage.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Control Systems
    { subject: 'Control Systems', topic: 'Stability', questionText: 'A control system is stable if all roots of the characteristic equation lie:', optionA: 'In the right half of s-plane', optionB: 'In the left half of s-plane', optionC: 'On the imaginary axis', optionD: 'At the origin', correctAnswer: 'B', explanation: 'For stability, all poles must have negative real parts (left half of s-plane).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Control Systems', topic: 'PID', questionText: 'In a PID controller, the derivative action:', optionA: 'Eliminates steady-state error', optionB: 'Improves transient response', optionC: 'Increases stability margin', optionD: 'Both B and C', correctAnswer: 'D', explanation: 'Derivative action responds to rate of change of error, improving transient response and increasing stability.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Renewable Energy
    { subject: 'Renewable Energy', topic: 'Solar PV', questionText: 'MPPT (Maximum Power Point Tracking) in solar PV systems is used to:', optionA: 'Increase solar irradiance', optionB: 'Extract maximum power from the panel', optionC: 'Reduce panel temperature', optionD: 'Increase panel voltage', correctAnswer: 'B', explanation: 'MPPT algorithms adjust the operating point of the solar panel to extract maximum available power under varying conditions.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Renewable Energy', topic: 'Wind Energy', questionText: 'The most common type of wind turbine generator used in modern wind farms is:', optionA: 'DC generator', optionB: 'Synchronous generator', optionC: 'Doubly-fed induction generator (DFIG)', optionD: 'Single-phase alternator', correctAnswer: 'C', explanation: 'DFIG is widely used because it allows variable-speed operation with partial power converter, reducing cost and losses.', difficulty: 'hard', marks: 1, createdBy: adminId, status: 'published' },

    // Measurements
    { subject: 'Electrical Measurements', topic: 'Instruments', questionText: 'A moving coil instrument measures:', optionA: 'AC only', optionB: 'DC only', optionC: 'Both AC and DC', optionD: 'Neither AC nor DC', correctAnswer: 'B', explanation: 'PMMC (permanent magnet moving coil) instruments work on DC only because the torque direction reverses with AC.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Electrical Measurements', topic: 'Bridges', questionText: 'Wheatstone bridge is used to measure:', optionA: 'Inductance', optionB: 'Capacitance', optionC: 'Resistance', optionD: 'Frequency', correctAnswer: 'C', explanation: 'Wheatstone bridge is used for precise measurement of medium resistances (1Ω to 1MΩ).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Electric Vehicles
    { subject: 'Electric Vehicles', topic: 'Batteries', questionText: 'The most commonly used battery type in modern electric vehicles is:', optionA: 'Lead-acid', optionB: 'Nickel-Cadmium', optionC: 'Lithium-ion', optionD: 'Sodium-sulfur', correctAnswer: 'C', explanation: 'Lithium-ion batteries are preferred in EVs due to high energy density, low self-discharge, and long cycle life.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Electric Vehicles', topic: 'Motors', questionText: 'BLDC motors are preferred in electric vehicles because:', optionA: 'They are cheaper', optionB: 'They have high efficiency and compact size', optionC: 'They require no controller', optionD: 'They operate on AC directly', correctAnswer: 'B', explanation: 'BLDC motors offer high efficiency (>90%), compact size, high torque-to-weight ratio, and low maintenance (no brushes).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Industrial Automation
    { subject: 'Industrial Automation', topic: 'PLC', questionText: 'PLC stands for:', optionA: 'Programmable Logic Controller', optionB: 'Power Line Communication', optionC: 'Programmable Loop Control', optionD: 'Process Logic Controller', correctAnswer: 'A', explanation: 'PLC = Programmable Logic Controller, used for industrial automation and control.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Industrial Automation', topic: 'SCADA', questionText: 'SCADA systems are primarily used for:', optionA: 'Motor control', optionB: 'Supervisory monitoring and control of industrial processes', optionC: 'Power factor correction', optionD: 'Battery charging', correctAnswer: 'B', explanation: 'SCADA (Supervisory Control and Data Acquisition) provides real-time monitoring, data collection, and control of industrial processes.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
  ];

  for (const q of questions) {
    const existing = await prisma.eEEQuestion.findFirst({
      where: { subject: q.subject, questionText: q.questionText }
    });
    if (!existing) {
      await prisma.eEEQuestion.create({ data: q });
    }
  }
  console.log(`  ✅ ${questions.length} EEE technical questions seeded`);

  console.log('\n✅ EEE seed complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

