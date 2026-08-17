import {
  initMongo,
  getDatabaseStatus,
  getMongoConfig,
  saveMongoConfig,
  getMongoConfigHistory,
  rollbackMongoConfig,
  getMongoLeads,
  saveMongoLead,
  deleteMongoLead,
  getMongoWebhooks,
  saveMongoWebhook,
  updateMongoWebhookStatus,
  createMongoSession,
  validateMongoSession,
  deleteMongoSession,
  createMongoUser,
  validateUserCredentials,
  findMongoUserByUsername,
  SEED_CONFIG,
  SEED_LEADS,
} from './mongo.js';

export { initMongo, getDatabaseStatus, SEED_CONFIG, SEED_LEADS };

export async function createUser(userData) {
  return await createMongoUser(userData);
}

export async function validateCredentials(username, password) {
  return await validateUserCredentials(username, password);
}

export async function findUserByUsername(username) {
  return await findMongoUserByUsername(username);
}

export async function getConfig() {
  return await getMongoConfig();
}

export async function saveConfig(
  newConfig,
  updatedBy = 'Dale Whitmore',
  changeNotes = 'Updated pricing configuration'
) {
  return await saveMongoConfig(newConfig, updatedBy, changeNotes);
}

export async function getConfigHistory() {
  return await getMongoConfigHistory();
}

export async function rollbackConfig(targetVersion, updatedBy = 'Dale Whitmore') {
  return await rollbackMongoConfig(targetVersion, updatedBy);
}

export async function getLeads(searchQuery, versionFilter) {
  return await getMongoLeads(searchQuery, versionFilter);
}

export async function saveLead(lead) {
  return await saveMongoLead(lead);
}

export async function deleteLead(leadId) {
  return await deleteMongoLead(leadId);
}

export async function getWebhooks() {
  return await getMongoWebhooks();
}

export async function saveWebhook(url, secret = '', active = true) {
  return await saveMongoWebhook(url, secret, active);
}

export async function updateWebhookStatus(id, status) {
  return await updateMongoWebhookStatus(id, status);
}

export async function createSession(username, name, role) {
  return await createMongoSession(username, name, role);
}

export async function validateSession(token) {
  return await validateMongoSession(token);
}

export async function deleteSession(token) {
  return await deleteMongoSession(token);
}
