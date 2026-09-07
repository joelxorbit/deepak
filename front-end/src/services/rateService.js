import { api } from '../utils/api';

/**
 * Fetch all rate rules (Admin)
 * GET /api/rates
 */
export const fetchRateRulesService = async (params = {}) => {
  const response = await api.get('/rates', { params });
  return response.data.data;
};

/**
 * Fetch rate rule by ID
 * GET /api/rates/:id
 */
export const fetchRateRuleByIdService = async (id) => {
  const response = await api.get(`/rates/${id}`);
  return response.data.data;
};

/**
 * Create a new dynamic rate rule (Admin)
 * POST /api/rates
 */
export const createRateRuleService = async (ruleData) => {
  const response = await api.post('/rates', ruleData);
  return response.data.data;
};

/**
 * Update an existing dynamic rate rule (Admin)
 * PUT /api/rates/:id
 */
export const updateRateRuleService = async (id, ruleData) => {
  const response = await api.put(`/rates/${id}`, ruleData);
  return response.data.data;
};

/**
 * Toggle rate rule active/inactive status (Admin)
 * PATCH /api/rates/:id/active
 */
export const toggleRateRuleActiveService = async (id, isActive) => {
  const response = await api.patch(`/rates/${id}/active`, { isActive });
  return response.data.data;
};

/**
 * Delete a rate rule (Admin)
 * DELETE /api/rates/:id
 */
export const deleteRateRuleService = async (id) => {
  const response = await api.delete(`/rates/${id}`);
  return response.data.data;
};
