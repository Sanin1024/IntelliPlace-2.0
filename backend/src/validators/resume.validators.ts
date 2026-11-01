import { z } from 'zod';

const educationEntry = z.object({
  institution: z.string().min(2).max(120),
  degree: z.string().min(2).max(100),
  year: z.string().max(20),
  score: z.string().max(30).optional(),
});

const projectEntry = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500),
  techStack: z.string().max(200).optional(),
  link: z.string().url().max(300).optional(),
});

const linkEntry = z.object({
  label: z.string().min(2).max(50),
  url: z.string().url().max(300),
});

export const saveResumeDataSchema = z.object({
  body: z.object({
    summary: z.string().max(1000).optional().nullable(),
    education: z.array(educationEntry).max(5).optional().nullable(),
    skills: z.array(z.string().min(1).max(60)).max(30).optional(),
    projects: z.array(projectEntry).max(5).optional().nullable(),
    links: z.array(linkEntry).max(5).optional().nullable(),
  }),
});