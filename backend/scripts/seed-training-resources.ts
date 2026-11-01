import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('Seeding Training Resources...');

  // Find admin user for createdBy
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  const createdBy = admin ? admin.id : 'system';

  const sampleResources: any[] = [
    {
      title: 'Data Structures & Algorithms in Java & C++',
      description: 'Comprehensive placement-focused curriculum covering arrays, trees, dynamic programming, and graph algorithms.',
      resourceType: 'course',
      provider: 'NPTEL / GeeksforGeeks',
      externalUrl: 'https://archive.nptel.ac.in/courses/106/106/106106127/',
      category: 'DSA',
      difficulty: 'Intermediate',
      accessType: 'Free',
      durationHrs: 45.0,
      tags: ['DSA', 'Java', 'C++', 'Algorithms', 'Placements'],
      status: 'published',
      createdBy,
    },
    {
      title: 'Quantitative & Logical Aptitude Sprint for TCS/Infosys',
      description: 'Master time-and-work, probability, syllogisms, and coding-decoding questions frequently asked in tier-1 IT recruitment exams.',
      resourceType: 'aptitude_test',
      provider: 'IndiaBIX & PrepInsta',
      externalUrl: 'https://www.indiabix.com/aptitude/questions-and-answers/',
      category: 'Aptitude',
      difficulty: 'Beginner',
      accessType: 'Free',
      durationHrs: 25.0,
      tags: ['Aptitude', 'Reasoning', 'TCS', 'Infosys', 'Cognizant'],
      status: 'published',
      createdBy,
    },
    {
      title: 'Full Stack MERN Developer Mastery with Production Deployment',
      description: 'Build and deploy scalable full-stack applications with React, Node.js, Express, MongoDB, and Docker containerization.',
      resourceType: 'course',
      provider: 'Coursera / Open Source',
      externalUrl: 'https://fullstackopen.com/en/',
      category: 'Web Development',
      difficulty: 'Advanced',
      accessType: 'Free',
      durationHrs: 60.0,
      tags: ['React', 'Node.js', 'Express', 'MongoDB', 'Docker'],
      status: 'published',
      createdBy,
    },
    {
      title: 'Competitive Coding Hot 100 Challenges (LeetCode / CodeChef Pattern)',
      description: 'Curated 100 high-frequency placement interview questions with optimal Big-O complexity solutions.',
      resourceType: 'coding_challenge',
      provider: 'LeetCode / Striver SDE',
      externalUrl: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/',
      category: 'DSA',
      difficulty: 'Intermediate',
      accessType: 'Free',
      durationHrs: 35.0,
      tags: ['LeetCode', 'Interview', 'Hot100', 'FAANG'],
      status: 'published',
      createdBy,
    },
    {
      title: 'NASSCOM IT-BPM Industry Skills & Salary Benchmarking Report 2026',
      description: 'Comprehensive analysis of demand in Indian IT sector: Cloud, Generative AI, Cyber Security, and full stack compensation trends.',
      resourceType: 'industry_report',
      provider: 'NASSCOM Research',
      externalUrl: 'https://nasscom.in/knowledge-centre/publications',
      category: 'Industry Trends',
      difficulty: 'Beginner',
      accessType: 'Free',
      durationHrs: 3.0,
      tags: ['Industry', 'NASSCOM', 'Career', 'Hiring Trends'],
      status: 'published',
      createdBy,
    },
    {
      title: 'Indian Placement & Hiring Dataset (2020-2025 Analytics)',
      description: 'Cleaned multi-college anonymized placement dataset with CGPA, internship count, backlogs, technical test scores, and offer packages.',
      resourceType: 'dataset',
      provider: 'Kaggle Datasets',
      externalUrl: 'https://www.kaggle.com/datasets',
      category: 'Data Science',
      difficulty: 'Intermediate',
      accessType: 'Free',
      durationHrs: 10.0,
      tags: ['Dataset', 'Kaggle', 'Machine Learning', 'Analytics'],
      status: 'published',
      createdBy,
    },
  ];

  for (const r of sampleResources) {
    const existing = await prisma.trainingResource.findFirst({
      where: { title: r.title },
    });

    if (!existing) {
      await prisma.trainingResource.create({
        data: r,
      });
      console.log(`+ Created: ${r.title}`);
    } else {
      console.log(`= Already exists: ${r.title}`);
    }
  }

  // Also seed default providers
  const providers = [
    { name: 'NPTEL SWAYAM', baseUrl: 'https://archive.nptel.ac.in', providerType: 'learning', integrationType: 'manual', syncEnabled: true },
    { name: 'Kaggle Hub', baseUrl: 'https://www.kaggle.com', providerType: 'dataset', integrationType: 'manual', syncEnabled: true },
    { name: 'TakeUForward / Striver', baseUrl: 'https://takeuforward.org', providerType: 'coding', integrationType: 'manual', syncEnabled: true },
    { name: 'IndiaBIX Aptitude', baseUrl: 'https://www.indiabix.com', providerType: 'learning', integrationType: 'manual', syncEnabled: true },
  ];

  for (const p of providers) {
    await prisma.resourceProvider.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
    console.log(`+ Provider verified: ${p.name}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding resources:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
