import { Router } from 'express';
import { getColleges } from '../controllers/collegeController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const collegeRoutes: Router = Router();

collegeRoutes.get('/', asyncHandler(getColleges));
