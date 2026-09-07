import {
  getRateRulesService,
  getRateRuleByIdService,
  createRateRuleService,
  updateRateRuleService,
  toggleRateRuleActiveService,
  deleteRateRuleService
} from '../services/rateService.js';
import { sendSuccess } from '../utils/response.js';

export const getRateRules = async (req, res, next) => {
  try {
    const { sportId, status } = req.query;
    const rules = await getRateRulesService({ sportId, status });
    return sendSuccess(res, 'Rate rules retrieved successfully', rules);
  } catch (error) {
    next(error);
  }
};

export const getRateRuleById = async (req, res, next) => {
  try {
    const rule = await getRateRuleByIdService(req.params.id);
    return sendSuccess(res, 'Rate rule retrieved successfully', rule);
  } catch (error) {
    next(error);
  }
};

export const createRateRule = async (req, res, next) => {
  try {
    const newRule = await createRateRuleService(req.body, req.admin);
    return sendSuccess(res, 'Rate rule created successfully', newRule, 201);
  } catch (error) {
    next(error);
  }
};

export const updateRateRule = async (req, res, next) => {
  try {
    const updated = await updateRateRuleService(req.params.id, req.body, req.admin);
    return sendSuccess(res, 'Rate rule updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const toggleRateRuleActive = async (req, res, next) => {
  try {
    const isActive = req.body.active !== undefined
      ? Boolean(req.body.active)
      : (req.body.status === 'active' || req.body.isActive === true);

    const updated = await toggleRateRuleActiveService(req.params.id, isActive, req.admin);
    return sendSuccess(res, `Rate rule ${isActive ? 'activated' : 'deactivated'} successfully`, updated);
  } catch (error) {
    next(error);
  }
};

export const deleteRateRule = async (req, res, next) => {
  try {
    const result = await deleteRateRuleService(req.params.id, req.admin);
    return sendSuccess(res, 'Rate rule deleted successfully', result);
  } catch (error) {
    next(error);
  }
};
