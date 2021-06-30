import validate from './lib/validator';


/**
 * Match a Metadata instance against rules using Validate.js for validation.
 * @param  {InstanceMetadata} metadataInstance Metadata instance object
 * @param  {Array} rules Array of MatchingRules instances (StudyMatchingRule|SeriesMatchingRule|ImageMatchingRule) for the match
 * @return {Object}      Matching Object with score and details (which rule passed or failed)
 */
const match = (metadataInstance, rules, customAttributeRetrievalCallbacks) => {
  const options = {
    format: 'grouped',
  };

  const details = {
    passed: [],
    failed: [],
  };

  let requiredFailed = false;
  let score = 0;

  rules.forEach(rule => {
    const attribute = rule.attribute;

    // Do not use the custom attribute from the metadataInstance since it is subject to change
    if (customAttributeRetrievalCallbacks.hasOwnProperty(attribute)) {
      const customAttribute = customAttributeRetrievalCallbacks[attribute];
      metadataInstance[attribute] = customAttribute.callback(metadataInstance);
    }

    // Format the constraint as required by Validate.js
    const testConstraint = {
      [attribute]: rule.constraint,
    };

    // Create a single attribute object to be validated, since metadataInstance is an
    // instance of Metadata (StudyMetadata, SeriesMetadata or InstanceMetadata)
    const attributeValue = metadataInstance[attribute];
    const attributeMap = {
      [attribute]: attributeValue,
    };

    // Use Validate.js to evaluate the constraints on the specified metadataInstance
    let errorMessages;
    try {
      errorMessages = validate(attributeMap, testConstraint, [options]);
    } catch (e) {
      errorMessages = ['Something went wrong during validation.', e];
    }

    if (!errorMessages) {
      // If no errorMessages were returned, then validation passed.

      // Add the rule's weight to the total score
      score += parseInt(rule.weight, 10);

      // Log that this rule passed in the matching details object
      details.passed.push({
        rule,
      });
    } else {
      // If errorMessages were present, then validation failed

      // If the rule that failed validation was Required, then
      // mark that a required Rule has failed
      if (rule.required) {
        requiredFailed = true;
      }

      // Log that this rule failed in the matching details object
      // and include any error messages
      details.failed.push({
        rule,
        errorMessages,
      });
    }
  });

  // If a required Rule has failed Validation, set the matching score to zero
  if (requiredFailed) {
    score = 0;
  }

  return {
    score,
    details,
    requiredFailed,
  };
};

const HPMatcher = {
  match,
};

export { HPMatcher };
