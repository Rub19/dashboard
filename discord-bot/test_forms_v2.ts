import { formRepository } from './src/modules/forms/storage/formRepository.js';
import { formConditionService } from './src/modules/forms/services/formConditionService.js';
import { formScoringService } from './src/modules/forms/services/formScoringService.js';
import { formAutomationService } from './src/modules/forms/services/formAutomationService.js';
import { formService } from './src/modules/forms/services/formService.js';
import { discordFormPanel } from './src/modules/forms/ui/discordFormPanel.js';
import { DiscordForm, FormAnswer, FormResponse } from './src/modules/forms/types/index.js';

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

function setupTestFixtures(guildId: string) {
  const demoForms: DiscordForm[] = [
    {
      id: 'staff-app',
      guildId,
      title: 'Candidature Modérateur / Staff 2026',
      description: 'Rejoignez notre équipe de modération ETHONE. Remplissez ce formulaire complet.',
      category: 'Staff & Modération',
      status: 'PUBLISHED',
      version: 1,
      sections: [
        { id: 'sec-1', title: 'Identité & Profil', description: 'Informations de base sur votre profil Discord', order: 0 },
        { id: 'sec-2', title: 'Expérience & Compétences', description: 'Détaillez vos antécédents en modération', order: 1 },
        { id: 'sec-3', title: 'Disponibilités & Motivation', description: 'Pourquoi souhaitez-vous rejoindre le staff ?', order: 2 },
      ],
      fields: [
        {
          id: 'f-age',
          type: 'NUMBER',
          label: 'Quel est votre âge ?',
          description: 'Âge minimum requis : 16 ans',
          placeholder: '18',
          required: true,
          min: 14,
          max: 99,
          sectionId: 'sec-1',
          order: 0,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'f-exp',
          type: 'YES_NO',
          label: 'Avez-vous déjà été modérateur sur un serveur Discord ?',
          description: 'Expérience préalable sur un serveur de plus de 500 membres',
          placeholder: '',
          required: true,
          sectionId: 'sec-2',
          order: 0,
          options: [
            { id: 'exp-yes', label: 'Oui', value: 'yes', points: 25 },
            { id: 'exp-no', label: 'Non', value: 'no', points: 5 },
          ],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'f-exp-desc',
          type: 'LONG_TEXT',
          label: 'Décrivez votre expérience passée et vos responsabilités',
          description: 'Précisez le type de serveur, la taille et les outils utilisés',
          placeholder: "J'ai modéré le serveur X (2 500 membres) pendant 8 mois...",
          required: false,
          minLength: 20,
          maxLength: 1000,
          sectionId: 'sec-2',
          order: 1,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'f-hours',
          type: 'SELECT',
          label: "Combien d'heures par semaine pouvez-vous consacrer au serveur ?",
          description: '',
          placeholder: '',
          required: true,
          sectionId: 'sec-3',
          order: 0,
          options: [
            { id: 'h-1', label: 'Moins de 5 heures', value: 'less_5', points: 5 },
            { id: 'h-2', label: '5 à 15 heures', value: '5_15', points: 15 },
            { id: 'h-3', label: '15 à 25 heures', value: '15_25', points: 25 },
            { id: 'h-4', label: 'Plus de 25 heures', value: 'more_25', points: 30 },
          ],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'f-motivation',
          type: 'LONG_TEXT',
          label: 'Quelles sont vos motivations pour rejoindre ETHONE ?',
          description: "Ce que vous pouvez apporter à l'équipe",
          placeholder: 'Je souhaite aider la communauté et participer activement...',
          required: true,
          minLength: 30,
          maxLength: 1500,
          sectionId: 'sec-3',
          order: 1,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
      ],
      conditions: [
        {
          id: 'cond-1',
          sourceFieldId: 'f-exp',
          operator: 'EQUALS',
          value: 'yes',
          action: 'SHOW_FIELD',
          targetFieldId: 'f-exp-desc',
          logicGate: 'ALL',
        },
      ],
      scoring: {
        enabled: true,
        maxScore: 100,
        passScore: 60,
        thresholds: { low: 39, medium: 69, high: 100 },
      },
      antiSpam: {
        cooldownMinutes: 1440,
        maxSubmissionsPerUser: 1,
        minAccountAgeDays: 7,
        minGuildMembershipDays: 1,
        requiredRoleIds: [],
        forbiddenRoleIds: [],
        blacklistUserIds: [],
      },
      automations: [
        {
          id: 'auto-1',
          name: 'Notification Staff sur nouvelle candidature',
          enabled: true,
          trigger: 'RESPONSE_SUBMITTED',
          conditions: {},
          actions: [
            {
              type: 'SEND_CHANNEL_MESSAGE',
              messageTemplate: '📥 **Nouvelle candidature reçue** de {userTag} pour le formulaire "{formTitle}" (Score préliminaire : {score}/100)',
            },
          ],
        },
        {
          id: 'auto-2',
          name: "Attribution Rôle Apprenti Modérateur à l'approbation",
          enabled: true,
          trigger: 'RESPONSE_APPROVED',
          conditions: {},
          actions: [
            {
              type: 'ADD_ROLE',
              targetRoleId: 'role-mod-trial',
            },
            {
              type: 'SEND_DM',
              messageTemplate: "Félicitations {userTag} ! Votre candidature a été acceptée par l'équipe ETHONE.",
            },
          ],
        },
      ],
      panelConfig: {
        channelId: '123456789012345688',
        embedTitle: '🛡️ Recrutement Staff ETHONE 2026',
        embedDescription: 'Vous souhaitez vous investir et aider la communauté au quotidien ?\nPostulez dès maintenant via notre formulaire en ligne sécurisé.',
        embedColor: '#6366f1',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Application Center • Réponse sous 48h',
        buttonText: 'Candidater au Staff',
        buttonEmoji: '📝',
        buttonStyle: 'PRIMARY',
        submissionMode: 'HYBRID',
      },
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'partner-app',
      guildId,
      title: 'Demande de Partenariat ETHONE',
      description: 'Établissez un partenariat officiel avec notre communauté.',
      category: 'Partenariats & Réseaux',
      status: 'PUBLISHED',
      version: 1,
      sections: [
        { id: 'sec-p1', title: 'Détails du Partenaire', description: 'Informations sur votre serveur', order: 0 },
      ],
      fields: [
        {
          id: 'fp-name',
          type: 'SHORT_TEXT',
          label: 'Nom de votre serveur Discord',
          description: '',
          placeholder: 'Ex: Gaming Haven France',
          required: true,
          sectionId: 'sec-p1',
          order: 0,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'fp-members',
          type: 'NUMBER',
          label: 'Nombre de membres actifs',
          description: '',
          placeholder: '500',
          required: true,
          min: 50,
          sectionId: 'sec-p1',
          order: 1,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
        {
          id: 'fp-link',
          type: 'URL',
          label: "Lien d'invitation permanent",
          description: '',
          placeholder: 'https://discord.gg/exemple',
          required: true,
          sectionId: 'sec-p1',
          order: 2,
          options: [],
          allowedFileTypes: [],
          maxFileSizeMb: 10,
        },
      ],
      conditions: [],
      scoring: { enabled: false, maxScore: 100, passScore: 50, thresholds: { low: 30, medium: 60, high: 100 } },
      antiSpam: { cooldownMinutes: 4320, maxSubmissionsPerUser: 1, minAccountAgeDays: 14, minGuildMembershipDays: 3, requiredRoleIds: [], forbiddenRoleIds: [], blacklistUserIds: [] },
      automations: [],
      panelConfig: {
        channelId: '123456789012345689',
        embedTitle: '🤝 Demandes de Partenariat',
        embedDescription: 'Soumettez votre serveur pour une alliance communautaire.',
        embedColor: '#f59e0b',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Partnerships',
        buttonText: 'Demander un Partenariat',
        buttonEmoji: '🤝',
        buttonStyle: 'SECONDARY',
        submissionMode: 'WEB',
      },
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  ];

  for (const f of demoForms) {
    formRepository.saveForm(f);
  }

  const demoResponses: FormResponse[] = [
    {
      id: 'resp-1',
      formId: 'staff-app',
      guildId,
      userId: '987654321098765432',
      userTag: 'Aurelien#1337',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      answers: [
        { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 21 },
        { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'yes' },
        { fieldId: 'f-exp-desc', fieldLabel: 'Décrivez votre expérience passée et vos responsabilités', fieldType: 'LONG_TEXT', value: 'Modérateur pendant 1 an sur un serveur eSport francophone de 3 200 membres.' },
        { fieldId: 'f-hours', fieldLabel: "Combien d'heures par semaine pouvez-vous consacrer au serveur ?", fieldType: 'SELECT', value: '15_25' },
        { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: "J'apprécie particulièrement l'ambiance du serveur et le professionnalisme des outils ETHONE." },
      ],
      score: 85,
      scoreLabel: 'High',
      status: 'PENDING',
      assignedReviewerId: '111222333444555666',
      assignedReviewerTag: 'SeniorMod#0001',
      tags: ['Expérimenté', 'Majeur', 'Actif'],
      internalNotes: [
        {
          id: 'note-1',
          authorId: '111222333444555666',
          authorTag: 'SeniorMod#0001',
          content: 'Profil très sérieux avec de solides références.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      submittedAt: new Date(Date.now() - 14400000).toISOString(),
      metadata: { accountAgeDays: 450, guildMemberDays: 45 },
    },
    {
      id: 'resp-2',
      formId: 'staff-app',
      guildId,
      userId: '555666777888999000',
      userTag: 'Lucas_Dev#4040',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
      answers: [
        { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 19 },
        { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'yes' },
        { fieldId: 'f-exp-desc', fieldLabel: 'Décrivez votre expérience passée et vos responsabilités', fieldType: 'LONG_TEXT', value: 'Animateur et modérateur.' },
        { fieldId: 'f-hours', fieldLabel: "Combien d'heures par semaine pouvez-vous consacrer au serveur ?", fieldType: 'SELECT', value: '5_15' },
        { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: 'Motivé pour assurer une présence en soirée et les week-ends.' },
      ],
      score: 70,
      scoreLabel: 'High',
      status: 'APPROVED',
      assignedReviewerId: '111222333444555666',
      assignedReviewerTag: 'SeniorMod#0001',
      tags: ['Majeur', 'Soirées'],
      internalNotes: [
        {
          id: 'note-2',
          authorId: '111222333444555666',
          authorTag: 'SeniorMod#0001',
          content: 'Entretien vocal passé avec succès. Rôle assigné.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      decisionReason: 'Candidature retenue après entretien concluant.',
      submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 86400000).toISOString(),
      metadata: { accountAgeDays: 620, guildMemberDays: 80 },
    },
    {
      id: 'resp-3',
      formId: 'staff-app',
      guildId,
      userId: '333444555666777888',
      userTag: 'NoobMaster#9999',
      userAvatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
      answers: [
        { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 14 },
        { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'no' },
        { fieldId: 'f-hours', fieldLabel: "Combien d'heures par semaine pouvez-vous consacrer au serveur ?", fieldType: 'SELECT', value: 'less_5' },
        { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: "J'aimerais avoir les perms pour aider mes potes sur le serv." },
      ],
      score: 25,
      scoreLabel: 'Low',
      status: 'REJECTED',
      assignedReviewerId: '111222333444555666',
      assignedReviewerTag: 'SeniorMod#0001',
      tags: ['Mineur', 'Non retenu'],
      internalNotes: [
        {
          id: 'note-3',
          authorId: '111222333444555666',
          authorTag: 'SeniorMod#0001',
          content: "Critère d'âge non respecté et motivations insuffisantes.",
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
      decisionReason: "Âge minimum requis non atteint et manque d'expérience.",
      submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      metadata: { accountAgeDays: 30, guildMemberDays: 2 },
    },
  ];

  for (const r of demoResponses) {
    formRepository.saveResponse(r);
  }
}

async function runTests() {
  console.log('\n=== [ETHONE FORMS & APPLICATIONS 2.0 — TEST SUITE] ===\n');
  const demoGuildId = '123456789012345678';
  setupTestFixtures(demoGuildId);

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
