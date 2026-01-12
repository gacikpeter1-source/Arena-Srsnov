const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'arenasrsnov',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createUserRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser');
}
createUserRef.operationName = 'CreateUser';
exports.createUserRef = createUserRef;

exports.createUser = function createUser(dc) {
  return executeMutation(createUserRef(dc));
};

const listTrainersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTrainers');
}
listTrainersRef.operationName = 'ListTrainers';
exports.listTrainersRef = listTrainersRef;

exports.listTrainers = function listTrainers(dc) {
  return executeQuery(listTrainersRef(dc));
};

const createReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateReservation', inputVars);
}
createReservationRef.operationName = 'CreateReservation';
exports.createReservationRef = createReservationRef;

exports.createReservation = function createReservation(dcOrVars, vars) {
  return executeMutation(createReservationRef(dcOrVars, vars));
};

const getMyReviewsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyReviews');
}
getMyReviewsRef.operationName = 'GetMyReviews';
exports.getMyReviewsRef = getMyReviewsRef;

exports.getMyReviews = function getMyReviews(dc) {
  return executeQuery(getMyReviewsRef(dc));
};
