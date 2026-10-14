const fields = { reps: 1000, weightKg: 1000, leftWeightKg: 1000, rightWeightKg: 1000, seconds: 86400, speedKmph: 100, inclineDegrees: 90 };
const metricFields = { reps: 'reps', weight: 'weightKg', time: 'seconds', speed: 'speedKmph', incline: 'inclineDegrees' };

export function validLoggedExercise(exercise) {
  if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise) ||
      ['id', 'name', 'plannedName', 'prescription', 'description'].some((key) => typeof exercise[key] !== 'string') ||
      !['strength', 'timed'].includes(exercise.kind) || !Array.isArray(exercise.sets) || !exercise.sets.length || exercise.sets.length > 30 ||
      (exercise.timeUnit !== undefined && !['seconds', 'minutes'].includes(exercise.timeUnit)) ||
      (exercise.individualWeights !== undefined && typeof exercise.individualWeights !== 'boolean')) return false;
  if (exercise.metrics !== undefined && (!Array.isArray(exercise.metrics) || !exercise.metrics.length || new Set(exercise.metrics).size !== exercise.metrics.length || exercise.metrics.some((metric) => !Object.hasOwn(metricFields, metric)))) return false;
  if (exercise.sets.some((set) => !set || typeof set !== 'object' || Array.isArray(set) || Object.entries(fields).some(([field, max]) => {
    const amount = set[field];
    return amount != null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > max || (field === 'reps' && (!Number.isInteger(amount) || amount === 0)) || (field === 'seconds' && amount === 0));
  }))) return false;
  const hasIndividualWeights = (set) => set.leftWeightKg != null && set.rightWeightKg != null && set.weightKg == null;
  const metrics = exercise.metrics || Object.keys(metricFields).filter((metric) => exercise.sets.some((set) => metric === 'weight' && exercise.individualWeights ? hasIndividualWeights(set) : set[metricFields[metric]] != null));
  if (exercise.individualWeights && !metrics.includes('weight')) return false;
  if (!exercise.individualWeights && exercise.sets.some((set) => set.leftWeightKg != null || set.rightWeightKg != null)) return false;
  return metrics.length > 0 && exercise.sets.every((set) => metrics.every((metric) => metric === 'weight' && exercise.individualWeights ? hasIndividualWeights(set) : set[metricFields[metric]] != null));
}
