import { FormCondition, FormField } from '../types/index.js';

export class FormConditionService {
  /**
   * Evaluate a single condition against current form answers.
   */
  public evaluateCondition(condition: FormCondition, answersMap: Record<string, any>): boolean {
    const rawVal = answersMap[condition.sourceFieldId];
    const targetVal = condition.value;

    switch (condition.operator) {
      case 'EQUALS':
        return String(rawVal ?? '').toLowerCase() === String(targetVal ?? '').toLowerCase();

      case 'NOT_EQUALS':
        return String(rawVal ?? '').toLowerCase() !== String(targetVal ?? '').toLowerCase();

      case 'CONTAINS':
        if (Array.isArray(rawVal)) {
          return rawVal.some((v) => String(v).toLowerCase().includes(String(targetVal).toLowerCase()));
        }
        return String(rawVal ?? '').toLowerCase().includes(String(targetVal ?? '').toLowerCase());

      case 'NOT_CONTAINS':
        if (Array.isArray(rawVal)) {
          return !rawVal.some((v) => String(v).toLowerCase().includes(String(targetVal).toLowerCase()));
        }
        return !String(rawVal ?? '').toLowerCase().includes(String(targetVal ?? '').toLowerCase());

      case 'GREATER_THAN':
        return Number(rawVal) > Number(targetVal);

      case 'LESS_THAN':
        return Number(rawVal) < Number(targetVal);

      case 'IS_EMPTY':
        return rawVal === undefined || rawVal === null || rawVal === '' || (Array.isArray(rawVal) && rawVal.length === 0);

      case 'IS_NOT_EMPTY':
        return rawVal !== undefined && rawVal !== null && rawVal !== '' && (!Array.isArray(rawVal) || rawVal.length > 0);

      default:
        return true;
    }
  }

  /**
   * Determine whether a field should be visible based on all active conditions targeting it.
   */
  public isFieldVisible(fieldId: string, conditions: FormCondition[], answersMap: Record<string, any>): boolean {
    const fieldConditions = conditions.filter(
      (c) => c.targetFieldId === fieldId && (c.action === 'SHOW_FIELD' || c.action === 'HIDE_FIELD')
    );

    if (fieldConditions.length === 0) return true;

    // Separate SHOW and HIDE conditions
    const showConditions = fieldConditions.filter((c) => c.action === 'SHOW_FIELD');
    const hideConditions = fieldConditions.filter((c) => c.action === 'HIDE_FIELD');

    if (showConditions.length > 0) {
      // If logic gate is ALL, all must be true; if ANY, at least one must be true
      const gate = showConditions[0].logicGate || 'ALL';
      const results = showConditions.map((c) => this.evaluateCondition(c, answersMap));
      const passed = gate === 'ALL' ? results.every(Boolean) : results.some(Boolean);
      if (!passed) return false;
    }

    if (hideConditions.length > 0) {
      const gate = hideConditions[0].logicGate || 'ALL';
      const results = hideConditions.map((c) => this.evaluateCondition(c, answersMap));
      const shouldHide = gate === 'ALL' ? results.every(Boolean) : results.some(Boolean);
      if (shouldHide) return false;
    }

    return true;
  }

  /**
   * Determine whether a field is dynamically required.
   */
  public isFieldRequired(field: FormField, conditions: FormCondition[], answersMap: Record<string, any>): boolean {
    const requireConditions = conditions.filter(
      (c) => c.targetFieldId === field.id && (c.action === 'REQUIRE_FIELD' || c.action === 'UNREQUIRE_FIELD')
    );

    let required = field.required;

    for (const cond of requireConditions) {
      const met = this.evaluateCondition(cond, answersMap);
      if (met && cond.action === 'REQUIRE_FIELD') required = true;
      if (met && cond.action === 'UNREQUIRE_FIELD') required = false;
    }

    return required;
  }
}

export const formConditionService = new FormConditionService();
