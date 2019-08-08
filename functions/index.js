'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cut off time. Child nodes older than this will be deleted.
const CUTOFF_TIME = 60 * 60 * 1000; // 1 Hour in milliseconds.
const DELETE_BATCH_SIZE = 100;

/**
 * Delete records older than 1 hour
 */
exports.deleteOldLocations = functions.pubsub.schedule('every 1 hours').onRun(async context => {
  const db = admin.firestore();
  const staleDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() - CUTOFF_TIME));
  console.log(staleDate);
  const query = db.collection('everyone').where('time', '<=', staleDate).limit(DELETE_BATCH_SIZE);
  await deleteQueryBatch(db, query, DELETE_BATCH_SIZE);
});

async function deleteQueryBatch(db, query, batchSize) {
  const snapshot = await query.get();

  // When there are no documents left, we are done
  if (snapshot.size === 0) {
    return;
  }

  // Delete documents in a batch
  let batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const numDeleted = await batch.commit().size;

  if (numDeleted === 0) {
    return;
  }

  await deleteQueryBatch(db, query, batchSize);
}
