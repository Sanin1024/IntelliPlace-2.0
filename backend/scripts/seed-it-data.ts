import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Information Technology data...');

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin ? admin.id : 'system';

  // ============================================================
  // IT CAREER TRACKS
  // ============================================================
  const careerTracks: any[] = [
    { name: 'Full-Stack Developer', trackType: 'design_engineer', description: 'Frontend, backend, database, and deployment.', targetRoles: ['Full-Stack Developer', 'MERN Developer', 'Web Developer'], requiredSkills: ['React', 'Node.js', 'REST APIs', 'SQL', 'Git', 'Deployment'], recommendedSoftware: ['VS Code', 'Git', 'Postman', 'Docker'] },
    { name: 'Frontend Developer', trackType: 'production_engineer', description: 'HTML, CSS, JavaScript, React/Angular/Vue.', targetRoles: ['Frontend Developer', 'UI Developer', 'React Developer'], requiredSkills: ['HTML/CSS', 'JavaScript', 'React', 'TypeScript', 'Responsive Design'], recommendedSoftware: ['VS Code', 'Chrome DevTools', 'Figma'] },
    { name: 'Backend Developer', trackType: 'quality_engineer', description: 'APIs, databases, authentication, server logic.', targetRoles: ['Backend Developer', 'API Developer', 'Java Developer'], requiredSkills: ['Java/Python/Node.js', 'REST APIs', 'SQL', 'Authentication', 'Docker'], recommendedSoftware: ['IntelliJ', 'Postman', 'DBeaver', 'Docker'] },
    { name: 'Cloud Engineer', trackType: 'thermal_hvac_engineer', description: 'AWS/Azure/GCP, infrastructure, deployment.', targetRoles: ['Cloud Engineer', 'Cloud Architect', 'Solutions Architect'], requiredSkills: ['AWS', 'Linux', 'Networking', 'Terraform', 'IAM'], recommendedSoftware: ['AWS Console', 'Terraform', 'Linux Terminal'] },
    { name: 'DevOps and SRE Engineer', trackType: 'automation_robotics_engineer', description: 'CI/CD, Docker, Kubernetes, monitoring.', targetRoles: ['DevOps Engineer', 'SRE', 'Platform Engineer'], requiredSkills: ['Docker', 'Kubernetes', 'Jenkins/GitHub Actions', 'Linux', 'Terraform'], recommendedSoftware: ['Docker', 'Kubernetes', 'Jenkins', 'Prometheus'] },
    { name: 'Cybersecurity Engineer', trackType: 'cae_simulation_engineer', description: 'Security, penetration testing, SOC, incident response.', targetRoles: ['Security Engineer', 'SOC Analyst', 'Pentester'], requiredSkills: ['Networking', 'Linux Security', 'OWASP', 'SIEM', 'Incident Response'], recommendedSoftware: ['Wireshark', 'Kali Linux', 'Burp Suite', 'Splunk'] },
    { name: 'Data Analyst', trackType: 'maintenance_engineer', description: 'SQL, Python, visualization, reporting.', targetRoles: ['Data Analyst', 'BI Analyst', 'Reporting Analyst'], requiredSkills: ['SQL', 'Python', 'Excel', 'Power BI/Tableau', 'Statistics'], recommendedSoftware: ['Python', 'Power BI', 'Excel', 'SQL Client'] },
    { name: 'Data Engineer', trackType: 'project_field_engineer', description: 'ETL, pipelines, Spark, Kafka, data warehouses.', targetRoles: ['Data Engineer', 'ETL Developer', 'Big Data Engineer'], requiredSkills: ['Python', 'SQL', 'Apache Spark', 'Apache Kafka', 'Airflow'], recommendedSoftware: ['Python', 'Spark', 'Airflow', 'Snowflake'] },
    { name: 'Software Testing and QA Engineer', trackType: 'energy_aerospace_engineer', description: 'Manual and automation testing, API testing.', targetRoles: ['QA Engineer', 'Test Automation Engineer', 'SDET'], requiredSkills: ['Selenium', 'Playwright', 'API Testing', 'SQL', 'Python/Java'], recommendedSoftware: ['Selenium', 'Postman', 'JMeter', 'Playwright'] },
    { name: 'Network Engineer', trackType: 'graduate_engineer_trainee', description: 'Routing, switching, firewalls, network security.', targetRoles: ['Network Engineer', 'Network Administrator', 'CCNA Engineer'], requiredSkills: ['TCP/IP', 'Routing', 'Switching', 'Firewalls', 'Network Monitoring'], recommendedSoftware: ['Cisco Packet Tracer', 'Wireshark', 'GNS3'] },
  ];

  for (const t of careerTracks) {
    await prisma.careerTrack.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`  ✅ ${careerTracks.length} IT Career tracks seeded`);

  // ============================================================
  // IT ENGINEERING SOFTWARE
  // ============================================================
  const software: any[] = [
    { name: 'VS Code', category: 'IDE', vendor: 'Microsoft', isFree: true, hasStudentLicense: true, learningUrl: 'https://code.visualstudio.com/docs', supportedFormats: ['*'], careerTracks: ['design_engineer', 'production_engineer', 'quality_engineer', 'maintenance_engineer'], difficulty: 'beginner' },
    { name: 'Git', category: 'Version Control', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://git-scm.com/doc', supportedFormats: ['GIT'], careerTracks: ['design_engineer', 'production_engineer', 'quality_engineer', 'thermal_hvac_engineer', 'automation_robotics_engineer'], difficulty: 'beginner' },
    { name: 'Docker', category: 'Containers', vendor: 'Docker Inc', isFree: true, hasStudentLicense: true, learningUrl: 'https://docs.docker.com', supportedFormats: ['DOCKERFILE'], careerTracks: ['thermal_hvac_engineer', 'automation_robotics_engineer', 'quality_engineer'], difficulty: 'intermediate' },
    { name: 'Postman', category: 'API Testing', vendor: 'Postman', isFree: true, hasStudentLicense: true, learningUrl: 'https://learning.postman.com', supportedFormats: ['JSON'], careerTracks: ['design_engineer', 'quality_engineer', 'production_engineer', 'energy_aerospace_engineer'], difficulty: 'beginner' },
    { name: 'AWS Console', category: 'Cloud', vendor: 'Amazon', isFree: false, hasStudentLicense: false, learningUrl: 'https://aws.amazon.com/training', supportedFormats: ['N/A'], careerTracks: ['thermal_hvac_engineer', 'automation_robotics_engineer'], difficulty: 'advanced' },
    { name: 'Kubernetes', category: 'Orchestration', vendor: 'CNCF', isFree: true, hasStudentLicense: true, learningUrl: 'https://kubernetes.io/docs', supportedFormats: ['YAML'], careerTracks: ['automation_robotics_engineer', 'thermal_hvac_engineer'], difficulty: 'advanced' },
    { name: 'Terraform', category: 'IaC', vendor: 'HashiCorp', isFree: true, hasStudentLicense: true, learningUrl: 'https://developer.hashicorp.com/terraform/docs', supportedFormats: ['TF'], careerTracks: ['thermal_hvac_engineer', 'automation_robotics_engineer'], difficulty: 'intermediate' },
    { name: 'Selenium', category: 'Testing', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.selenium.dev/documentation', supportedFormats: ['JAVA', 'PY'], careerTracks: ['energy_aerospace_engineer'], difficulty: 'intermediate' },
    { name: 'Playwright', category: 'Testing', vendor: 'Microsoft', isFree: true, hasStudentLicense: true, learningUrl: 'https://playwright.dev/docs', supportedFormats: ['TS', 'JS'], careerTracks: ['energy_aerospace_engineer'], difficulty: 'intermediate' },
    { name: 'Power BI', category: 'Data Visualization', vendor: 'Microsoft', isFree: false, hasStudentLicense: true, learningUrl: 'https://learn.microsoft.com/power-bi', supportedFormats: ['PBIX'], careerTracks: ['maintenance_engineer'], difficulty: 'intermediate' },
    { name: 'Wireshark', category: 'Network Analysis', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://www.wireshark.org/docs', supportedFormats: ['PCAP'], careerTracks: ['cae_simulation_engineer', 'graduate_engineer_trainee'], difficulty: 'intermediate' },
    { name: 'Jupyter Notebook', category: 'Data Science', vendor: 'Open Source', isFree: true, hasStudentLicense: true, learningUrl: 'https://jupyter.org/documentation', supportedFormats: ['IPYNB'], careerTracks: ['maintenance_engineer', 'project_field_engineer'], difficulty: 'beginner' },
  ];

  for (const s of software) {
    await prisma.engineeringSoftware.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${software.length} IT software resources seeded`);

  // ============================================================
  // IT COMPANY PROFILES
  // ============================================================
  const companies: any[] = [
    {
      companyName: 'Tata Consultancy Services (TCS)',
      industry: 'IT Services',
      officialUrl: 'https://www.tcs.com',
      careersUrl: 'https://www.tcs.com/careers',
      description: 'Global leader in IT services, consulting and business solutions.',
      relevantRoles: ['Systems Engineer', 'GET', 'Software Developer', 'Analyst'],
      requiredSkills: ['Java', 'Python', 'SQL', 'Data Structures', 'Aptitude'],
      preferredLanguages: ['Java', 'Python', 'C++'],
      preferredFrameworks: ['Spring Boot', 'React'],
      relevantSubjects: ['Programming', 'DBMS', 'OOP', 'Data Structures', 'Operating Systems'],
      interviewAreas: ['Programming', 'DBMS', 'OOP', 'Computer Networks', 'Aptitude'],
      selectionProcess: 'NQT (Aptitude + Coding) → Technical Interview → HR Interview',
      codingPattern: 'Basic DSA (Arrays, Strings, Math)',
    },
    {
      companyName: 'Infosys',
      industry: 'IT Services',
      officialUrl: 'https://www.infosys.com',
      careersUrl: 'https://www.infosys.com/careers',
      description: 'Global leader in next-generation digital services and consulting.',
      relevantRoles: ['Systems Engineer', 'Power Programmer', 'GET'],
      requiredSkills: ['Java', 'Python', 'SQL', 'Problem Solving', 'Aptitude'],
      preferredLanguages: ['Java', 'Python'],
      preferredFrameworks: ['Spring', 'Hibernate'],
      relevantSubjects: ['DBMS', 'OOP', 'Data Structures', 'Algorithms'],
      interviewAreas: ['Programming', 'DBMS', 'OOP', 'SDLC', 'Aptitude'],
      selectionProcess: 'HackWithInfy / InfyTQ → Technical Interview → HR',
      codingPattern: 'DSA (Medium-Hard for Power Programmer)',
    },
    {
      companyName: 'Accenture',
      industry: 'IT Services',
      officialUrl: 'https://www.accenture.com',
      careersUrl: 'https://www.accenture.com/in-en/careers',
      description: 'Global professional services company with leading capabilities in digital, cloud and security.',
      relevantRoles: ['Associate Software Engineer', 'GET', 'Application Developer'],
      requiredSkills: ['Java', 'Python', 'SQL', 'Cloud Fundamentals', 'Communication'],
      preferredLanguages: ['Java', 'Python', 'C#'],
      preferredFrameworks: ['Spring Boot', '.NET', 'Angular'],
      relevantSubjects: ['Programming', 'DBMS', 'Cloud Computing', 'Web Technologies'],
      interviewAreas: ['Programming', 'DBMS', 'Cloud Basics', 'Communication', 'Aptitude'],
      selectionProcess: 'Cognitive + Technical Assessment → Coding → Interview',
      codingPattern: 'Basic-Medium DSA',
    },
    {
      companyName: 'Amazon',
      industry: 'Product',
      officialUrl: 'https://www.amazon.com',
      careersUrl: 'https://www.amazon.jobs',
      description: 'Global e-commerce and cloud computing giant.',
      relevantRoles: ['SDE I', 'Software Development Engineer', 'Cloud Support Associate'],
      requiredSkills: ['Data Structures', 'Algorithms', 'System Design', 'Java/C++', 'Problem Solving'],
      preferredLanguages: ['Java', 'C++', 'Python'],
      preferredFrameworks: ['AWS SDK'],
      relevantSubjects: ['DSA', 'OS', 'DBMS', 'Computer Networks', 'System Design'],
      interviewAreas: ['DSA (Hard)', 'System Design', 'OS', 'DBMS', 'Leadership Principles'],
      selectionProcess: 'Online Assessment (2 DSA Problems) → 4 Technical Rounds',
      codingPattern: 'Trees, Graphs, DP, System Design',
    },
    {
      companyName: 'Microsoft',
      industry: 'Product',
      officialUrl: 'https://www.microsoft.com',
      careersUrl: 'https://careers.microsoft.com',
      description: 'Global technology leader in software, cloud, and AI.',
      relevantRoles: ['Software Engineer', 'SDE', 'Cloud Engineer'],
      requiredSkills: ['C#', 'Data Structures', 'Algorithms', 'System Design', 'Azure'],
      preferredLanguages: ['C#', 'Java', 'C++', 'Python'],
      preferredFrameworks: ['.NET', 'Azure', 'React'],
      relevantSubjects: ['DSA', 'OS', 'DBMS', 'Cloud Computing', 'Computer Architecture'],
      interviewAreas: ['DSA (Medium-Hard)', 'System Design', 'OS', 'DBMS', 'Behavioral'],
      selectionProcess: 'OA (DSA) → 3-4 Technical Rounds → AA',
      codingPattern: 'Arrays, Strings, Trees, Graphs, DP',
    },
    {
      companyName: 'Zoho',
      industry: 'Product',
      officialUrl: 'https://www.zoho.com',
      careersUrl: 'https://www.zoho.com/careers',
      description: 'Indian software development company offering SaaS and cloud applications.',
      relevantRoles: ['Software Developer', 'Member Technical Staff', 'QA Engineer'],
      requiredSkills: ['C', 'C++', 'Java', 'Data Structures', 'DBMS', 'Aptitude'],
      preferredLanguages: ['C', 'C++', 'Java'],
      preferredFrameworks: ['Internal Frameworks'],
      relevantSubjects: ['DSA', 'DBMS', 'OOP', 'OS'],
      interviewAreas: ['DSA (Medium)', 'DBMS', 'OOP', 'OS', 'Aptitude'],
      selectionProcess: 'Aptitude → C Programming → Advanced Programming → Technical HR',
      codingPattern: 'String manipulation, Arrays, Linked Lists',
    },
    {
      companyName: 'Wipro',
      industry: 'IT Services',
      officialUrl: 'https://www.wipro.com',
      careersUrl: 'https://careers.wipro.com',
      description: 'Leading global information technology, consulting and business process services company.',
      relevantRoles: ['Project Engineer', 'GET', 'Software Developer'],
      requiredSkills: ['Java', 'Python', 'SQL', 'Communication', 'Aptitude'],
      preferredLanguages: ['Java', 'Python'],
      preferredFrameworks: ['Spring Boot'],
      relevantSubjects: ['Programming', 'DBMS', 'OOP', 'Computer Networks'],
      interviewAreas: ['Programming Basics', 'DBMS', 'OOP', 'Aptitude', 'HR'],
      selectionProcess: 'Online Assessment (Aptitude + Coding) → Technical + HR Interview',
      codingPattern: 'Basic DSA (Arrays, Strings)',
    },
    {
      companyName: 'IBM',
      industry: 'IT Services',
      officialUrl: 'https://www.ibm.com',
      careersUrl: 'https://www.ibm.com/employment',
      description: 'Global technology and innovation company offering AI, cloud, and consulting.',
      relevantRoles: ['Associate Software Developer', 'GET', 'Data Engineer'],
      requiredSkills: ['Java', 'Python', 'SQL', 'Cloud Fundamentals', 'AI Basics'],
      preferredLanguages: ['Java', 'Python'],
      preferredFrameworks: ['Spring', 'Django', 'IBM Cloud'],
      relevantSubjects: ['Programming', 'DBMS', 'Cloud Computing', 'AI Fundamentals'],
      interviewAreas: ['Programming', 'DBMS', 'Cloud', 'AI Basics', 'Aptitude'],
      selectionProcess: 'Online Assessment → Technical Interview → HR',
      codingPattern: 'Basic DSA + SQL',
    },
  ];

  for (const c of companies) {
    await prisma.iTCompanyProfile.upsert({
      where: { companyName: c.companyName },
      update: {},
      create: { ...c, createdBy: adminId, isVerified: true, lastVerifiedAt: new Date() },
    });
  }
  console.log(`  ✅ ${companies.length} IT Company profiles seeded`);

  // ============================================================
  // IT TECHNICAL QUESTIONS
  // ============================================================
  const questions: any[] = [
    // DBMS & SQL
    { subject: 'DBMS', topic: 'Normalization', questionText: 'Which normal form deals with transitive dependencies?', optionA: '1NF', optionB: '2NF', optionC: '3NF', optionD: 'BCNF', correctAnswer: 'C', explanation: '3NF eliminates transitive dependencies (non-prime attribute dependent on another non-prime attribute via a prime attribute).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'DBMS', topic: 'SQL', questionText: 'Which SQL clause is used to filter rows after GROUP BY?', optionA: 'WHERE', optionB: 'HAVING', optionC: 'GROUP BY', optionD: 'ORDER BY', correctAnswer: 'B', explanation: 'HAVING is used to filter groups after GROUP BY, while WHERE filters individual rows before grouping.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'DBMS', topic: 'ACID', questionText: 'Which ACID property ensures that either all operations of a transaction are completed or none?', optionA: 'Atomicity', optionB: 'Consistency', optionC: 'Isolation', optionD: 'Durability', correctAnswer: 'A', explanation: 'Atomicity ensures "all or nothing" - either all operations in a transaction succeed, or none do.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'DBMS', topic: 'Joins', questionText: 'Which JOIN returns all rows from both tables, with NULL for non-matching rows?', optionA: 'INNER JOIN', optionB: 'LEFT JOIN', optionC: 'RIGHT JOIN', optionD: 'FULL OUTER JOIN', correctAnswer: 'D', explanation: 'FULL OUTER JOIN returns all rows from both tables, filling NULLs where there is no match.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Data Structures
    { subject: 'Data Structures', topic: 'Arrays', questionText: 'What is the time complexity of accessing an element in an array by index?', optionA: 'O(1)', optionB: 'O(n)', optionC: 'O(log n)', optionD: 'O(n²)', correctAnswer: 'A', explanation: 'Array access by index is O(1) because the memory address can be calculated directly using base address + index × element size.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Data Structures', topic: 'Linked Lists', questionText: 'What is the main advantage of a linked list over an array?', optionA: 'Random access', optionB: 'Dynamic size', optionC: 'Less memory', optionD: 'Faster traversal', correctAnswer: 'B', explanation: 'Linked lists have dynamic size (can grow/shrink at runtime) while arrays have fixed size. However, arrays allow O(1) random access.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Data Structures', topic: 'Stacks', questionText: 'Which data structure uses LIFO (Last In First Out) principle?', optionA: 'Queue', optionB: 'Stack', optionC: 'Linked List', optionD: 'Tree', correctAnswer: 'B', explanation: 'Stack follows LIFO - the last element pushed is the first one popped. Used in function calls, expression evaluation, etc.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Data Structures', topic: 'Hash Tables', questionText: 'What is the average-case time complexity of search in a hash table?', optionA: 'O(1)', optionB: 'O(n)', optionC: 'O(log n)', optionD: 'O(n log n)', correctAnswer: 'A', explanation: 'Average case is O(1) due to direct mapping via hash function. Worst case is O(n) with collisions.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // OOP
    { subject: 'OOP', topic: 'Pillars', questionText: 'Which is NOT one of the four pillars of OOP?', optionA: 'Encapsulation', optionB: 'Inheritance', optionC: 'Compilation', optionD: 'Polymorphism', correctAnswer: 'C', explanation: 'The four pillars are: Encapsulation, Inheritance, Polymorphism, and Abstraction. Compilation is not an OOP concept.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'OOP', topic: 'Polymorphism', questionText: 'Method overloading is an example of:', optionA: 'Runtime polymorphism', optionB: 'Compile-time polymorphism', optionC: 'Inheritance', optionD: 'Encapsulation', correctAnswer: 'B', explanation: 'Method overloading is compile-time polymorphism (static binding). Method overriding is runtime polymorphism (dynamic binding).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Operating Systems
    { subject: 'Operating Systems', topic: 'Processes', questionText: 'A deadlock occurs when:', optionA: 'Two processes compete for CPU', optionB: 'Processes wait for each other indefinitely', optionC: 'A process crashes', optionD: 'Memory is full', correctAnswer: 'B', explanation: "Deadlock occurs when two or more processes wait for each other's resources indefinitely, creating a circular wait.", difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Operating Systems', topic: 'Scheduling', questionText: 'Which scheduling algorithm cannot cause starvation?', optionA: 'Priority Scheduling', optionB: 'Shortest Job First', optionC: 'Round Robin', optionD: 'Multilevel Queue', correctAnswer: 'C', explanation: 'Round Robin gives every process a fixed time quantum, ensuring no process is starved. SJF and Priority can cause starvation.', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Computer Networks
    { subject: 'Computer Networks', topic: 'OSI Model', questionText: 'In the OSI model, which layer is responsible for routing?', optionA: 'Data Link Layer', optionB: 'Network Layer', optionC: 'Transport Layer', optionD: 'Session Layer', correctAnswer: 'B', explanation: 'The Network Layer (Layer 3) handles routing and logical addressing (IP addresses).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Computer Networks', topic: 'TCP/UDP', questionText: 'Which protocol provides reliable, ordered delivery of data?', optionA: 'UDP', optionB: 'TCP', optionC: 'ICMP', optionD: 'ARP', correctAnswer: 'B', explanation: 'TCP provides reliable, ordered, error-checked delivery. UDP is unreliable but faster (no overhead of acknowledgments).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Web Development
    { subject: 'Web Development', topic: 'HTTP', questionText: 'Which HTTP status code indicates "Not Found"?', optionA: '200', optionB: '301', optionC: '404', optionD: '500', correctAnswer: 'C', explanation: '404 Not Found means the requested resource could not be found on the server. 200=OK, 301=Redirect, 500=Server Error.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Web Development', topic: 'REST', questionText: 'In REST API, which HTTP method is idempotent?', optionA: 'POST', optionB: 'GET', optionC: 'PATCH', optionD: 'PUT', correctAnswer: 'B', explanation: 'GET is idempotent (multiple calls produce same result). PUT is also idempotent. POST is not idempotent (creates new resources).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },

    // Cloud Computing
    { subject: 'Cloud Computing', topic: 'Service Models', questionText: 'Which cloud service model provides virtual machines and networking?', optionA: 'SaaS', optionB: 'PaaS', optionC: 'IaaS', optionD: 'FaaS', correctAnswer: 'C', explanation: 'IaaS (Infrastructure as a Service) provides VMs, storage, and networking. SaaS=software, PaaS=platform, FaaS=functions.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Cloud Computing', topic: 'AWS', questionText: 'Which AWS service is used for object storage?', optionA: 'EC2', optionB: 'RDS', optionC: 'S3', optionD: 'Lambda', correctAnswer: 'C', explanation: 'Amazon S3 (Simple Storage Service) is used for object storage. EC2=compute, RDS=database, Lambda=serverless functions.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Cybersecurity
    { subject: 'Cybersecurity', topic: 'Attacks', questionText: 'SQL Injection is an attack that targets:', optionA: 'Network infrastructure', optionB: 'Database queries through user input', optionC: 'DNS servers', optionD: 'Physical security', correctAnswer: 'B', explanation: 'SQL Injection exploits insufficient input validation to inject malicious SQL queries into database queries.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Cybersecurity', topic: 'OWASP', questionText: 'Which is #1 in the OWASP Top 10?', optionA: 'Broken Access Control', optionB: 'Injection', optionC: 'XSS', optionD: 'CSRF', correctAnswer: 'A', explanation: 'In OWASP Top 10 (2021), Broken Access Control is #1, moving up from #5 in 2017. Injection dropped to #3.', difficulty: 'hard', marks: 1, createdBy: adminId, status: 'published' },

    // DevOps
    { subject: 'DevOps', topic: 'CI/CD', questionText: 'What does CI stand for in DevOps?', optionA: 'Continuous Integration', optionB: 'Continuous Inspection', optionC: 'Code Integration', optionD: 'Continuous Implementation', correctAnswer: 'A', explanation: 'CI = Continuous Integration (automatically building and testing code changes). CD = Continuous Delivery/Deployment.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'DevOps', topic: 'Docker', questionText: 'A Docker container is:', optionA: 'A virtual machine', optionB: 'A lightweight, standalone executable package', optionC: 'A cloud service', optionD: 'A database', correctAnswer: 'B', explanation: 'Docker containers are lightweight, standalone packages that include everything needed to run software (code, runtime, libraries).', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Software Engineering
    { subject: 'Software Engineering', topic: 'SDLC', questionText: 'Which SDLC model uses iterative development cycles called sprints?', optionA: 'Waterfall', optionB: 'Agile', optionC: 'V-Model', optionD: 'Big Bang', correctAnswer: 'B', explanation: 'Agile uses iterative sprints (typically 2-4 weeks) to deliver working software incrementally.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Software Engineering', topic: 'Git', questionText: 'Which Git command creates a new branch and switches to it?', optionA: 'git branch new-branch', optionB: 'git switch new-branch', optionC: 'git checkout -b new-branch', optionD: 'git create new-branch', correctAnswer: 'C', explanation: 'git checkout -b creates a new branch and immediately switches to it. Git 2.23+ also supports: git switch -c new-branch.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },

    // Algorithms
    { subject: 'Algorithms', topic: 'Sorting', questionText: 'What is the worst-case time complexity of QuickSort?', optionA: 'O(n log n)', optionB: 'O(n²)', optionC: 'O(n)', optionD: 'O(log n)', correctAnswer: 'B', explanation: 'QuickSort worst case is O(n²) when the pivot is always the smallest or largest element. Average case is O(n log n).', difficulty: 'medium', marks: 1, createdBy: adminId, status: 'published' },
    { subject: 'Algorithms', topic: 'Searching', questionText: 'Binary search requires the array to be:', optionA: 'Sorted', optionB: 'Unsorted', optionC: 'Empty', optionD: 'Reversed', correctAnswer: 'A', explanation: 'Binary search only works on sorted arrays because it compares the target with the middle element to eliminate half the array.', difficulty: 'easy', marks: 1, createdBy: adminId, status: 'published' },
  ];

  for (const q of questions) {
    const existing = await prisma.iTQuestion.findFirst({
      where: { subject: q.subject, questionText: q.questionText }
    });
    if (!existing) {
      await prisma.iTQuestion.create({ data: q });
    }
  }
  console.log(`  ✅ ${questions.length} IT technical questions seeded`);

  console.log('\n✅ IT seed complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

