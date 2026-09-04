import { formRepository } from './src/modules/forms/storage/formRepository.js';
import { formConditionService } from './src/modules/forms/services/formConditionService.js';
import { formScoringService } from './src/modules/forms/services/formScoringService.js';
import { formAutomationService } from './src/modules/forms/services/formAutomationService.js';
import { formService } from './src/modules/forms/services/formService.js';
import { discordFormPanel } from './src/modules/forms/ui/discordFormPanel.js';
import { DiscordForm, FormAnswer } from './src/modules/forms/types/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== [ETHONE FORMS & APPLICATIONS 2.0 — TEST SUITE] ===\n');
  const demoGuildId = '123456789012345678';

  // 1. Storage & Seeding
  console.log('--- 1. Storage & Seeding ---');
  const forms = formRepository.getForms(demoGuildId);
  assert(forms.length >= 2, 'Default demo forms seeded (>= 2)');

  const staffForm = formRepository.getFormById(demoGuildId, 'staff-app');
  assert(staffForm !== null, 'Staff application form exists');
  assert(staffForm?.status === 'PUBLISHED', 'Staff form is published');
  assert(staffForm?.fields.length === 5, 'Staff form contains 5 configured fields');

  const responses = formRepository.getResponses(demoGuildId, 'staff-app');
  assert(responses.length >= 3, 'Demo responses seeded for staff-app');

  const stats = formRepository.getOverviewStats(demoGuildId);
  assert(stats.totalForms >= 2, 'Overview stats calculate total forms');
  assert(stats.pendingReviews >= 1, 'Pending reviews count detected');

  // 2. Conditional Logic Engine
  console.log('\n--- 2. Conditional Logic Engine ---');
  const conditions = staffForm!.conditions;

  // With experience = yes -> description field should be visible
  const answersExpYes = { 'f-exp': 'yes' };
  const isVisibleYes = formConditionService.isFieldVisible('f-exp-desc', conditions, answersExpYes);
  assert(isVisibleYes === true, 'Field f-exp-desc is visible when experience equals "yes"');

  // With experience = no -> description field should be hidden
  const answersExpNo = { 'f-exp': 'no' };
  const isVisibleNo = formConditionService.isFieldVisible('f-exp-desc', conditions, answersExpNo);
  assert(isVisibleNo === false, 'Field f-exp-desc is hidden when experience equals "no"');

  // Multi-condition evaluation
  const testCondEquals = formConditionService.evaluateCondition(
    { id: 'c1', sourceFieldId: 'test', operator: 'EQUALS', value: 'hello', action: 'SHOW_FIELD', logicGate: 'ALL' },
    { test: 'Hello' } // case insensitive
  );
  assert(testCondEquals === true, 'Condition EQUALS is case-insensitive match');

  const testCondGreater = formConditionService.evaluateCondition(
    { id: 'c2', sourceFieldId: 'age', operator: 'GREATER_THAN', value: 18, action: 'SHOW_FIELD', logicGate: 'ALL' },
    { age: 21 }
  );
  assert(testCondGreater === true, 'Condition GREATER_THAN evaluates numbers correctly');

  // 3. Scoring Engine
  console.log('\n--- 3. Scoring Engine ---');
  const answersToScore: FormAnswer[] = [
    { fieldId: 'f-exp', fieldLabel: 'Experience', fieldType: 'YES_NO', value: 'yes' }, // 25 pts
    { fieldId: 'f-hours', fieldLabel: 'Hours', fieldType: 'SELECT', value: '15_25' }, // 25 pts
  ];

  const scoreResult = formScoringService.calculateScore(staffForm!, answersToScore);
  assert(scoreResult.score === 50, 'Calculated score accurately sums points (25 + 25 = 50)');
  assert(scoreResult.scoreLabel === 'Medium', 'Score 50 is categorized as Medium');

  const maxAnswers: FormAnswer[] = [
    { fieldId: 'f-exp', fieldLabel: 'Experience', fieldType: 'YES_NO', value: 'yes' }, // 25
    { fieldId: 'f-hours', fieldLabel: 'Hours', fieldType: 'SELECT', value: 'more_25' }, // 30
  ];
  const maxScoreResult = formScoringService.calculateScore(staffForm!, maxAnswers);
  assert(maxScoreResult.score === 55, 'Score correctly evaluated with more_25 option (55 pts)');

  // 4. Anti-Spam & Submission Validation
  console.log('\n--- 4. Anti-Spam & Submission Validation ---');
  // Submitting missing required field
  const invalidSubmission = await formService.submitResponse({
    guildId: demoGuildId,
    formId: 'staff-app',
    userId: 'test-user-fresh-1',
    userTag: 'TestUser#1234',
    answers: [], // Missing required fields
  });
  assert(invalidSubmission.success === false, 'Rejects submission with missing required fields');
  assert(invalidSubmission.error?.includes('obligatoire') === true, 'Returns explicit required field error message');

  // Valid submission
  const validAnswers: FormAnswer[] = [
    { fieldId: 'f-age', fieldLabel: 'Age', fieldType: 'NUMBER', value: 20 },
    { fieldId: 'f-exp', fieldLabel: 'Exp', fieldType: 'YES_NO', value: 'no' },
    // f-exp-desc is hidden so not required!
    { fieldId: 'f-hours', fieldLabel: 'Hours', fieldType: 'SELECT', value: '5_15' },
    { fieldId: 'f-motivation', fieldLabel: 'Motivation', fieldType: 'LONG_TEXT', value: 'Je suis très motivé pour aider le serveur.' },
  ];

  const dynamicUserId = `test-user-submit-${Date.now()}`;
  const validSubmission = await formService.submitResponse({
    guildId: demoGuildId,
    formId: 'staff-app',
    userId: dynamicUserId,
    userTag: 'CandidateTwo#4444',
    answers: validAnswers,
    metadata: { accountAgeDays: 50, guildMemberDays: 10 },
  });

  if (!validSubmission.success) {
    console.error('Submission error:', validSubmission.error);
  }
  assert(validSubmission.success === true, 'Accepts valid submission and saves response');
  assert(validSubmission.response?.status === 'PENDING', 'New submission receives PENDING status');
  const newRespId = validSubmission.response?.id;

  // 5. Staff Review System & Notes
  console.log('\n--- 5. Staff Review System & Notes ---');
  if (newRespId) {
    // Add internal staff note
    const noted = formService.addNote({
      guildId: demoGuildId,
      responseId: newRespId,
      authorId: 'staff-reviewer-1',
      authorTag: 'HeadMod#0001',
      content: 'Candidature vérifiée. En attente de l\'entretien vocal.',
    });
    assert(noted?.internalNotes.length === 1, 'Internal staff note added successfully');

    // Assign reviewer
    const assigned = formService.assignReviewer({
      guildId: demoGuildId,
      responseId: newRespId,
      reviewerId: 'staff-reviewer-1',
      reviewerTag: 'HeadMod#0001',
    });
    assert(assigned?.status === 'REVIEWING', 'Assigning reviewer transitions status to REVIEWING');
    assert(assigned?.assignedReviewerTag === 'HeadMod#0001', 'Assigned reviewer tag saved');

    // Review decision (Approve)
    const reviewed = await formService.reviewResponse({
      guildId: demoGuildId,
      responseId: newRespId,
      reviewerId: 'staff-reviewer-1',
      reviewerTag: 'HeadMod#0001',
      status: 'APPROVED',
      decisionReason: 'Profil sérieux et motivé.',
    });
    assert(reviewed.success === true, 'Review decision recorded');
    assert(reviewed.response?.status === 'APPROVED', 'Status transitioned to APPROVED');
  }

  // 6. Automations & Discord UI
  console.log('\n--- 6. Automations & Discord UI ---');
  const canModal = discordFormPanel.canUseDiscordModal(staffForm!);
  assert(canModal === true, 'Staff form qualifies for Discord Modal (< 5 text fields)');

  const panelEmbed = discordFormPanel.buildPanelEmbed(staffForm!);
  assert(panelEmbed.data.title === '🛡️ Recrutement Staff ETHONE 2026', 'Panel embed title matches config');

  const panelRow = discordFormPanel.buildPanelActionRow(staffForm!);
  assert(panelRow.components.length === 1, 'Panel action row contains application button');

  // 7. Exports & Duplication
  console.log('\n--- 7. Exports & Duplication ---');
  const csvExport = formService.exportResponses(demoGuildId, 'staff-app', 'csv');
  assert(csvExport.includes('Response ID'), 'CSV export generates proper headers');
  assert(csvExport.includes('CandidateTwo#4444'), 'CSV export includes submitted candidate tag');

  const jsonExport = formService.exportResponses(demoGuildId, 'staff-app', 'json');
  assert(jsonExport.startsWith('['), 'JSON export returns valid JSON array');

  const duplicated = formRepository.duplicateForm(demoGuildId, 'staff-app', 'Staff App 2027');
  assert(duplicated !== null, 'Form duplication succeeds');
  assert(duplicated?.title === 'Staff App 2027', 'Duplicated form title set correctly');
  assert(duplicated?.status === 'DRAFT', 'Duplicated form is initialized as DRAFT');

  // Cleanup duplicated form
  if (duplicated) {
    formRepository.deleteForm(demoGuildId, duplicated.id);
  }

  console.log(`\n=== RESULTS: ${passed}/${passed + failed} tests passed (${((passed / (passed + failed)) * 100).toFixed(1)}%) ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
