import { Router } from 'express';
import {
  createQuestion, getAllQuestions,
  getQuestionById, updateQuestion, deleteQuestion,
} from '../controllers/question.controller.js';
import { validate } from '../utils/validate.js';
import {
  createQuestionSchema, updateQuestionSchema, questionIdSchema,
} from '../validators/question.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All question routes require authentication
router.use(requireAuth);

// Read access: all authenticated users (trainer creates, student practices)
router.get('/', getAllQuestions);
router.get('/:id', validate(questionIdSchema), getQuestionById);

// Write access: trainer and admin
router.post('/', requireRole('trainer', 'admin'), validate(createQuestionSchema), createQuestion);
router.put('/:id', requireRole('trainer', 'admin'), validate(updateQuestionSchema), updateQuestion);
router.delete('/:id', requireRole('trainer', 'admin'), validate(questionIdSchema), deleteQuestion);

export default router;