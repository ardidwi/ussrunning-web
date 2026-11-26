const requiredFieldCount = 4;

export function profileCompletion(missingFields: string[]) {
  return {
    percentage: Math.round((1 - missingFields.length / requiredFieldCount) * 100),
    missingFields,
  };
}
