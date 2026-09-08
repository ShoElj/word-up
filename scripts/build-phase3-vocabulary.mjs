#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import { normalizeRecord, validateWordBankRecords } from './word-bank-utils.mjs';

const TARGET_APPROVED_WORDS = 500;
const TARGET_CURRICULUM_DAYS = 365;
const MIN_EXPERT_WORDS = 10;

const stagePlans = [
  { start: 21, end: 30, themes: ['everyday_expression'], categories: ['everyday_life', 'communication', 'descriptive'], difficulties: ['elementary', 'intermediate'] },
  { start: 31, end: 60, themes: ['communication'], categories: ['communication'], difficulties: ['elementary', 'intermediate', 'upper_intermediate'] },
  { start: 61, end: 90, themes: ['personality', 'relationships'], categories: ['personality', 'relationships'], difficulties: ['intermediate', 'upper_intermediate'] },
  { start: 91, end: 120, themes: ['emotions'], categories: ['emotions', 'personality', 'relationships'], difficulties: ['elementary', 'intermediate', 'upper_intermediate'] },
  { start: 121, end: 150, themes: ['thinking'], categories: ['thinking', 'academic'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 151, end: 180, themes: ['work', 'professional_language'], categories: ['work', 'professional'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 181, end: 210, themes: ['education', 'academic_language'], categories: ['education', 'academic'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 211, end: 240, themes: ['society', 'culture'], categories: ['society', 'culture'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 241, end: 270, themes: ['descriptive_language', 'nuance_and_precision'], categories: ['descriptive', 'communication', 'interesting_words'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 271, end: 300, themes: ['science_and_technology'], categories: ['science', 'technology', 'nature', 'health'], difficulties: ['intermediate', 'upper_intermediate', 'advanced'] },
  { start: 301, end: 330, themes: ['nuance_and_precision', 'communication'], categories: ['communication', 'thinking', 'relationships'], difficulties: ['upper_intermediate', 'advanced', 'expert', 'intermediate'] },
  { start: 331, end: 365, themes: ['interesting_words', 'academic_language', 'professional_language'], categories: ['academic', 'professional', 'thinking', 'interesting_words', 'society'], difficulties: ['upper_intermediate', 'advanced', 'expert', 'intermediate'] },
];

const categoryToTheme = {
  communication: 'communication',
  personality: 'personality',
  emotions: 'emotions',
  thinking: 'thinking',
  work: 'work',
  education: 'education',
  relationships: 'relationships',
  society: 'society',
  nature: 'science_and_technology',
  science: 'science_and_technology',
  technology: 'science_and_technology',
  culture: 'culture',
  travel: 'everyday_expression',
  health: 'everyday_expression',
  everyday_life: 'everyday_expression',
  descriptive: 'descriptive_language',
  academic: 'academic_language',
  professional: 'professional_language',
  interesting_words: 'interesting_words',
};

const lessonTypeByCategory = {
  communication: 'communication',
  descriptive: 'descriptive',
  professional: 'professional',
  work: 'professional',
  emotions: 'emotional',
  thinking: 'thinking',
  academic: 'thinking',
  education: 'learn',
};

const expansionEntries = [
  ['accurate', 'adjective', 'elementary', 'communication', 'correct and free from major error'],
  ['adapt', 'verb', 'elementary', 'everyday_life', 'to change so something fits a new situation'],
  ['adjust', 'verb', 'elementary', 'everyday_life', 'to make a small change that improves fit or function'],
  ['approach', 'noun', 'elementary', 'thinking', 'a way of dealing with a task or problem'],
  ['aware', 'adjective', 'elementary', 'thinking', 'noticing or knowing that something exists'],
  ['basic', 'adjective', 'beginner', 'everyday_life', 'simple and necessary before other things'],
  ['benefit', 'noun', 'elementary', 'work', 'a useful or positive result'],
  ['calm', 'adjective', 'beginner', 'emotions', 'not upset, nervous, or hurried'],
  ['capable', 'adjective', 'elementary', 'personality', 'able to do something well enough'],
  ['careful', 'adjective', 'beginner', 'personality', 'acting with attention to avoid mistakes'],
  ['choice', 'noun', 'beginner', 'thinking', 'an option selected from more than one possibility'],
  ['common', 'adjective', 'beginner', 'everyday_life', 'seen or happening often'],
  ['compare', 'verb', 'elementary', 'academic', 'to look at things to understand similarities and differences'],
  ['complete', 'adjective', 'elementary', 'work', 'having all necessary parts'],
  ['confident', 'adjective', 'elementary', 'personality', 'sure about ability or judgment'],
  ['consider', 'verb', 'elementary', 'thinking', 'to think carefully before deciding'],
  ['create', 'verb', 'elementary', 'work', 'to make something new'],
  ['decide', 'verb', 'beginner', 'thinking', 'to choose after thinking'],
  ['depend', 'verb', 'elementary', 'relationships', 'to need support or be affected by something'],
  ['detail', 'noun', 'elementary', 'communication', 'a small fact or feature in something larger'],
  ['develop', 'verb', 'elementary', 'education', 'to grow, improve, or make something stronger'],
  ['direct', 'adjective', 'elementary', 'communication', 'clear and straight to the point'],
  ['discover', 'verb', 'elementary', 'education', 'to find or learn something for the first time'],
  ['effect', 'noun', 'elementary', 'thinking', 'a result caused by something'],
  ['effort', 'noun', 'beginner', 'work', 'energy used to achieve something'],
  ['encourage', 'verb', 'elementary', 'relationships', 'to give someone support or confidence'],
  ['fair', 'adjective', 'beginner', 'society', 'treating people in a reasonable and equal way'],
  ['familiar', 'adjective', 'elementary', 'everyday_life', 'known because of previous experience'],
  ['focus', 'verb', 'elementary', 'thinking', 'to give attention to one thing'],
  ['formal', 'adjective', 'elementary', 'communication', 'suitable for serious or official situations'],
  ['frequent', 'adjective', 'elementary', 'everyday_life', 'happening often'],
  ['generous', 'adjective', 'elementary', 'personality', 'willing to give time, help, or resources'],
  ['honest', 'adjective', 'beginner', 'personality', 'truthful and not trying to deceive'],
  ['impact', 'noun', 'elementary', 'society', 'a strong effect on someone or something'],
  ['improve', 'verb', 'elementary', 'education', 'to make something better'],
  ['include', 'verb', 'beginner', 'communication', 'to make someone or something part of a group'],
  ['influence', 'noun', 'elementary', 'relationships', 'the power to affect choices or behavior'],
  ['inform', 'verb', 'elementary', 'communication', 'to give someone useful information'],
  ['intend', 'verb', 'elementary', 'thinking', 'to plan or mean to do something'],
  ['issue', 'noun', 'elementary', 'work', 'a topic, concern, or problem to discuss'],
  ['manage', 'verb', 'elementary', 'work', 'to handle or control something successfully'],
  ['method', 'noun', 'elementary', 'education', 'an organized way to do something'],
  ['notice', 'verb', 'beginner', 'thinking', 'to become aware of something'],
  ['patient', 'adjective', 'elementary', 'personality', 'able to wait without becoming upset'],
  ['practical', 'adjective', 'elementary', 'work', 'useful in real situations'],
  ['prefer', 'verb', 'beginner', 'everyday_life', 'to like one option more than another'],
  ['prepare', 'verb', 'elementary', 'work', 'to get ready for something'],
  ['prevent', 'verb', 'elementary', 'health', 'to stop something from happening'],
  ['progress', 'noun', 'elementary', 'education', 'movement toward improvement or completion'],
  ['purpose', 'noun', 'elementary', 'thinking', 'the reason something exists or is done'],
  ['reduce', 'verb', 'elementary', 'work', 'to make something smaller or less'],
  ['respect', 'noun', 'beginner', 'relationships', 'careful regard for someone or something'],
  ['responsible', 'adjective', 'elementary', 'personality', 'trusted to act carefully and fairly'],
  ['result', 'noun', 'beginner', 'thinking', 'what happens because of an action or event'],
  ['simple', 'adjective', 'beginner', 'everyday_life', 'easy to understand or do'],
  ['specific', 'adjective', 'elementary', 'communication', 'clearly identified rather than general'],
  ['stable', 'adjective', 'elementary', 'work', 'steady and unlikely to change suddenly'],
  ['support', 'verb', 'beginner', 'relationships', 'to help someone or something succeed'],
  ['useful', 'adjective', 'beginner', 'everyday_life', 'able to help with a real need'],
  ['valuable', 'adjective', 'elementary', 'professional', 'important because it is useful or meaningful'],
  ['varied', 'adjective', 'elementary', 'descriptive', 'having different kinds or forms'],
  ['willing', 'adjective', 'elementary', 'personality', 'ready to do something without being forced'],
  ['ability', 'noun', 'elementary', 'education', 'the skill or power to do something'],
  ['active', 'adjective', 'beginner', 'health', 'doing things with energy or movement'],
  ['advice', 'noun', 'beginner', 'relationships', 'guidance offered to help someone decide'],
  ['balance', 'noun', 'elementary', 'health', 'a steady state between different needs or forces'],
  ['challenge', 'noun', 'elementary', 'education', 'something difficult that tests skill or effort'],
  ['change', 'noun', 'beginner', 'everyday_life', 'a difference from what existed before'],
  ['concern', 'noun', 'elementary', 'emotions', 'a worry or matter needing attention'],
  ['connect', 'verb', 'elementary', 'relationships', 'to join or form a relationship'],
  ['control', 'noun', 'elementary', 'work', 'the ability to guide or limit something'],
  ['creative', 'adjective', 'elementary', 'culture', 'able to produce new and original ideas'],
  ['dependable', 'adjective', 'intermediate', 'personality', 'able to be trusted to do what is expected'],
  ['effective', 'adjective', 'intermediate', 'work', 'producing the result that was intended'],
  ['flexible', 'adjective', 'intermediate', 'personality', 'able to change when conditions change'],
  ['logical', 'adjective', 'intermediate', 'thinking', 'following clear reason and order'],
  ['meaningful', 'adjective', 'intermediate', 'relationships', 'important in a way that has value'],
  ['organized', 'adjective', 'intermediate', 'work', 'arranged clearly and efficiently'],
  ['reliable', 'adjective', 'intermediate', 'professional', 'able to be trusted consistently'],
  ['strategic', 'adjective', 'upper_intermediate', 'professional', 'planned to reach an important long-term goal'],
  ['thoughtful', 'adjective', 'intermediate', 'relationships', 'showing careful attention to people or ideas'],
  ['accurately', 'adverb', 'intermediate', 'communication', 'in a way that is correct and exact'],
  ['acknowledge', 'verb', 'intermediate', 'communication', 'to accept or recognize that something is true'],
  ['advocate', 'verb', 'upper_intermediate', 'society', 'to publicly support an idea or cause'],
  ['affirm', 'verb', 'upper_intermediate', 'communication', 'to state support or agreement clearly'],
  ['analyze', 'verb', 'intermediate', 'academic', 'to study something carefully by looking at its parts'],
  ['anticipate', 'verb', 'upper_intermediate', 'thinking', 'to expect something and prepare for it'],
  ['appropriate', 'adjective', 'intermediate', 'communication', 'suitable for a particular situation'],
  ['beneficial', 'adjective', 'intermediate', 'health', 'helpful or producing a good effect'],
  ['bias', 'noun', 'upper_intermediate', 'thinking', 'an unfair preference that affects judgment'],
  ['boundary', 'noun', 'intermediate', 'relationships', 'a limit that protects space, time, or behavior'],
  ['capacity', 'noun', 'intermediate', 'work', 'the amount someone or something can handle'],
  ['collaboration', 'noun', 'intermediate', 'work', 'the act of working together on a shared goal'],
  ['commitment', 'noun', 'intermediate', 'relationships', 'a promise or steady decision to continue'],
  ['communicate', 'verb', 'intermediate', 'communication', 'to share information, feelings, or ideas'],
  ['compassion', 'noun', 'intermediate', 'relationships', 'care for someone who is suffering or struggling'],
  ['competent', 'adjective', 'intermediate', 'professional', 'able to do something to a good standard'],
  ['complex', 'adjective', 'intermediate', 'thinking', 'having many connected parts'],
  ['comprehensive', 'adjective', 'upper_intermediate', 'academic', 'including all or nearly all important parts'],
  ['concept', 'noun', 'intermediate', 'education', 'an idea used to understand something'],
  ['conclude', 'verb', 'intermediate', 'thinking', 'to decide after considering information'],
  ['confidence', 'noun', 'intermediate', 'personality', 'belief in ability, judgment, or reliability'],
  ['confirm', 'verb', 'intermediate', 'communication', 'to show that something is true or agreed'],
  ['consequence', 'noun', 'intermediate', 'thinking', 'a result of an action or condition'],
  ['considerate', 'adjective', 'intermediate', 'relationships', 'careful about other people and their needs'],
  ['contribute', 'verb', 'intermediate', 'work', 'to add help, ideas, or effort to something'],
  ['convince', 'verb', 'intermediate', 'communication', 'to cause someone to believe or agree'],
  ['coordinate', 'verb', 'intermediate', 'work', 'to organize parts so they work together'],
  ['critical', 'adjective', 'intermediate', 'thinking', 'very important or involving careful judgment'],
  ['deliberate', 'adjective', 'upper_intermediate', 'thinking', 'done carefully and with intention'],
  ['demonstrate', 'verb', 'intermediate', 'education', 'to show clearly by example or evidence'],
  ['derive', 'verb', 'upper_intermediate', 'academic', 'to get something from a source or origin'],
  ['determine', 'verb', 'intermediate', 'thinking', 'to find out or decide with care'],
  ['distinct', 'adjective', 'intermediate', 'descriptive', 'clearly different or easy to recognize'],
  ['diverse', 'adjective', 'intermediate', 'society', 'including many different kinds of people or things'],
  ['emerge', 'verb', 'intermediate', 'thinking', 'to become visible, known, or important'],
  ['engage', 'verb', 'intermediate', 'communication', 'to take part or hold attention'],
  ['enhance', 'verb', 'intermediate', 'work', 'to improve the quality or value of something'],
  ['ensure', 'verb', 'intermediate', 'professional', 'to make certain that something happens'],
  ['essential', 'adjective', 'intermediate', 'everyday_life', 'absolutely necessary or extremely important'],
  ['estimate', 'verb', 'intermediate', 'work', 'to judge an amount or value roughly'],
  ['examine', 'verb', 'intermediate', 'academic', 'to look at something carefully'],
  ['expand', 'verb', 'intermediate', 'education', 'to make something larger, wider, or more complete'],
  ['experience', 'noun', 'intermediate', 'education', 'knowledge gained by doing or living through something'],
  ['facilitate', 'verb', 'upper_intermediate', 'professional', 'to make a process easier or smoother'],
  ['factor', 'noun', 'intermediate', 'thinking', 'one thing that influences a result'],
  ['feasible', 'adjective', 'upper_intermediate', 'work', 'possible and reasonable to do'],
  ['foundation', 'noun', 'intermediate', 'education', 'the base that supports later growth or understanding'],
  ['framework', 'noun', 'upper_intermediate', 'thinking', 'a structure for organizing ideas or actions'],
  ['function', 'noun', 'intermediate', 'technology', 'the purpose or job something performs'],
  ['fundamental', 'adjective', 'intermediate', 'education', 'forming a basic and important part'],
  ['identify', 'verb', 'intermediate', 'thinking', 'to recognize or name clearly'],
  ['illustrate', 'verb', 'intermediate', 'communication', 'to make an idea clear with an example'],
  ['implement', 'verb', 'upper_intermediate', 'professional', 'to put a plan or decision into action'],
  ['indicate', 'verb', 'intermediate', 'communication', 'to show or suggest something'],
  ['informal', 'adjective', 'elementary', 'communication', 'relaxed and not official'],
  ['integrate', 'verb', 'upper_intermediate', 'technology', 'to combine parts into a working whole'],
  ['interaction', 'noun', 'intermediate', 'relationships', 'communication or action between people or things'],
  ['judgment', 'noun', 'intermediate', 'thinking', 'the ability to make careful decisions'],
  ['maintain', 'verb', 'intermediate', 'work', 'to keep something in good condition or continue it'],
  ['moderate', 'adjective', 'intermediate', 'descriptive', 'not extreme in amount, strength, or opinion'],
  ['mutual', 'adjective', 'intermediate', 'relationships', 'shared by two or more people'],
  ['observe', 'verb', 'intermediate', 'science', 'to notice or watch carefully'],
  ['option', 'noun', 'elementary', 'thinking', 'a possible choice'],
  ['participate', 'verb', 'intermediate', 'society', 'to take part in an activity or event'],
  ['pattern', 'noun', 'intermediate', 'thinking', 'a repeated form, behavior, or arrangement'],
  ['potential', 'noun', 'intermediate', 'professional', 'ability that may develop in the future'],
  ['predict', 'verb', 'intermediate', 'science', 'to say what is likely to happen'],
  ['priority', 'noun', 'intermediate', 'work', 'something treated as more important than other things'],
  ['process', 'noun', 'intermediate', 'work', 'a series of actions that produce a result'],
  ['proportion', 'noun', 'upper_intermediate', 'academic', 'a part compared with the whole'],
  ['protect', 'verb', 'elementary', 'health', 'to keep safe from harm'],
  ['react', 'verb', 'elementary', 'emotions', 'to respond to something that happens'],
  ['recognize', 'verb', 'intermediate', 'thinking', 'to know or identify something from experience'],
  ['recommend', 'verb', 'intermediate', 'communication', 'to suggest something as a good choice'],
  ['reflect', 'verb', 'intermediate', 'thinking', 'to think carefully about something'],
  ['reinforce', 'verb', 'upper_intermediate', 'education', 'to strengthen an idea, habit, or structure'],
  ['resolve', 'verb', 'intermediate', 'relationships', 'to find a solution to a problem or disagreement'],
  ['respond', 'verb', 'elementary', 'communication', 'to answer or react'],
  ['restore', 'verb', 'intermediate', 'health', 'to bring something back to a better state'],
  ['reveal', 'verb', 'intermediate', 'communication', 'to make something known that was hidden'],
  ['review', 'verb', 'elementary', 'education', 'to look again to understand or improve'],
  ['significance', 'noun', 'upper_intermediate', 'academic', 'importance or meaning'],
  ['solution', 'noun', 'elementary', 'thinking', 'an answer to a problem'],
  ['source', 'noun', 'elementary', 'academic', 'where information, material, or support comes from'],
  ['strengthen', 'verb', 'intermediate', 'health', 'to make stronger'],
  ['structure', 'noun', 'intermediate', 'thinking', 'the way parts are arranged together'],
  ['suggest', 'verb', 'elementary', 'communication', 'to offer an idea for consideration'],
  ['suitable', 'adjective', 'intermediate', 'everyday_life', 'right or acceptable for a purpose'],
  ['tension', 'noun', 'intermediate', 'emotions', 'strain caused by pressure or disagreement'],
  ['transfer', 'verb', 'intermediate', 'work', 'to move something from one place or person to another'],
  ['transform', 'verb', 'upper_intermediate', 'technology', 'to change something greatly in form or character'],
  ['underlying', 'adjective', 'upper_intermediate', 'thinking', 'important but not immediately obvious'],
  ['valid', 'adjective', 'intermediate', 'academic', 'based on sound reasoning or accepted rules'],
  ['vary', 'verb', 'intermediate', 'descriptive', 'to be different or to change'],
  ['abstract', 'adjective', 'upper_intermediate', 'academic', 'based on ideas rather than physical things'],
  ['adaptation', 'noun', 'upper_intermediate', 'science', 'a change that helps something fit its environment'],
  ['adequate', 'adjective', 'intermediate', 'work', 'good enough for a need or purpose'],
  ['advantage', 'noun', 'intermediate', 'professional', 'a condition that makes success more likely'],
  ['alignment', 'noun', 'upper_intermediate', 'work', 'agreement between goals, actions, or parts'],
  ['alternative', 'noun', 'intermediate', 'thinking', 'another possible choice'],
  ['analogy', 'noun', 'upper_intermediate', 'communication', 'a comparison that explains an idea'],
  ['applicable', 'adjective', 'upper_intermediate', 'professional', 'relevant and able to be used'],
  ['arbitrary', 'adjective', 'upper_intermediate', 'thinking', 'chosen without a clear reason or fair system'],
  ['authentic', 'adjective', 'intermediate', 'personality', 'real, honest, and not copied or false'],
  ['autonomy', 'noun', 'advanced', 'society', 'the ability to make independent choices'],
  ['beneficiary', 'noun', 'upper_intermediate', 'society', 'a person who receives a benefit'],
  ['brevity', 'noun', 'upper_intermediate', 'communication', 'the quality of using few words'],
  ['capacity', 'noun', 'intermediate', 'professional', 'the ability to hold, produce, or manage something'],
  ['cohesive', 'adjective', 'upper_intermediate', 'communication', 'working together as a clear whole'],
  ['compatible', 'adjective', 'upper_intermediate', 'technology', 'able to work well together'],
  ['concrete', 'adjective', 'intermediate', 'communication', 'specific and based on real things'],
  ['constraint', 'noun', 'upper_intermediate', 'work', 'a limit that affects what can be done'],
  ['contextual', 'adjective', 'upper_intermediate', 'communication', 'related to the surrounding situation'],
  ['credible', 'adjective', 'intermediate', 'academic', 'able to be trusted or believed'],
  ['criterion', 'noun', 'upper_intermediate', 'academic', 'one standard used for judging something'],
  ['dedicate', 'verb', 'intermediate', 'work', 'to give time, effort, or resources to a purpose'],
  ['definitive', 'adjective', 'advanced', 'academic', 'accepted as final, complete, or authoritative'],
  ['delegate', 'verb', 'upper_intermediate', 'professional', 'to give responsibility to another person'],
  ['dependent', 'adjective', 'intermediate', 'relationships', 'needing support from someone or something'],
  ['differentiate', 'verb', 'upper_intermediate', 'academic', 'to show or recognize differences'],
  ['diminish', 'verb', 'upper_intermediate', 'descriptive', 'to become or make less important or strong'],
  ['disrupt', 'verb', 'upper_intermediate', 'technology', 'to interrupt normal progress or operation'],
  ['emphasis', 'noun', 'intermediate', 'communication', 'special importance or attention'],
  ['empirical', 'adjective', 'advanced', 'academic', 'based on observation or evidence'],
  ['endeavor', 'noun', 'advanced', 'professional', 'a serious effort to achieve something'],
  ['evolve', 'verb', 'intermediate', 'science', 'to develop gradually over time'],
  ['exemplify', 'verb', 'advanced', 'academic', 'to be a clear example of something'],
  ['explicitly', 'adverb', 'upper_intermediate', 'communication', 'in a clear and direct way'],
  ['feasibility', 'noun', 'upper_intermediate', 'work', 'the quality of being possible and practical'],
  ['fragmented', 'adjective', 'upper_intermediate', 'society', 'broken into separated or disconnected parts'],
  ['generate', 'verb', 'intermediate', 'technology', 'to produce or create something'],
  ['hierarchy', 'noun', 'upper_intermediate', 'professional', 'an ordered system of levels or importance'],
  ['hypothetical', 'adjective', 'advanced', 'thinking', 'based on a possible idea rather than fact'],
  ['ideally', 'adverb', 'intermediate', 'thinking', 'in the best or most suitable situation'],
  ['incentive', 'noun', 'upper_intermediate', 'work', 'something that encourages action'],
  ['inclination', 'noun', 'advanced', 'personality', 'a natural tendency or preference'],
  ['inconsistency', 'noun', 'upper_intermediate', 'thinking', 'a lack of agreement or steadiness'],
  ['infrastructure', 'noun', 'upper_intermediate', 'society', 'basic systems that support a place or organization'],
  ['inherent', 'adjective', 'advanced', 'thinking', 'existing as a natural part of something'],
  ['initial', 'adjective', 'intermediate', 'work', 'happening at the beginning'],
  ['interpretation', 'noun', 'upper_intermediate', 'academic', 'an explanation of meaning'],
  ['intervene', 'verb', 'advanced', 'society', 'to step in to change or help a situation'],
  ['justify', 'verb', 'upper_intermediate', 'academic', 'to give a good reason for something'],
  ['legacy', 'noun', 'upper_intermediate', 'culture', 'something passed down from the past'],
  ['leverage', 'verb', 'advanced', 'professional', 'to use something effectively for advantage'],
  ['marginal', 'adjective', 'advanced', 'academic', 'small or limited in importance or effect'],
  ['mechanism', 'noun', 'upper_intermediate', 'science', 'a process or system that makes something happen'],
  ['mediate', 'verb', 'upper_intermediate', 'relationships', 'to help people settle a disagreement'],
  ['notion', 'noun', 'upper_intermediate', 'thinking', 'an idea or belief'],
  ['obligation', 'noun', 'intermediate', 'society', 'a duty or responsibility'],
  ['paradox', 'noun', 'advanced', 'interesting_words', 'a statement or situation that seems contradictory but may be true'],
  ['parameter', 'noun', 'advanced', 'technology', 'a limit or factor that defines how something works'],
  ['precedent', 'noun', 'advanced', 'society', 'an earlier example that guides later decisions'],
  ['presume', 'verb', 'upper_intermediate', 'thinking', 'to believe something is true without complete proof'],
  ['proficient', 'adjective', 'upper_intermediate', 'education', 'skilled and capable through practice'],
  ['qualitative', 'adjective', 'advanced', 'academic', 'focused on qualities rather than numbers'],
  ['quantify', 'verb', 'advanced', 'academic', 'to measure or express as a number'],
  ['rationale', 'noun', 'advanced', 'thinking', 'the reason behind a decision or belief'],
  ['reciprocal', 'adjective', 'advanced', 'relationships', 'given or felt by both sides'],
  ['redundant', 'adjective', 'upper_intermediate', 'work', 'not needed because something else already does the job'],
  ['respective', 'adjective', 'upper_intermediate', 'communication', 'belonging separately to each person or thing'],
  ['rigorous', 'adjective', 'advanced', 'academic', 'careful, exact, and thorough'],
  ['scenario', 'noun', 'upper_intermediate', 'thinking', 'a possible situation or sequence of events'],
  ['scope', 'noun', 'upper_intermediate', 'work', 'the range or limit of what is included'],
  ['simulate', 'verb', 'advanced', 'technology', 'to imitate conditions for study or practice'],
  ['speculate', 'verb', 'upper_intermediate', 'thinking', 'to form ideas without enough proof'],
  ['substantial', 'adjective', 'upper_intermediate', 'academic', 'large or important enough to matter'],
  ['symmetry', 'noun', 'advanced', 'descriptive', 'balanced similarity between parts'],
  ['tangible', 'adjective', 'upper_intermediate', 'descriptive', 'real enough to be touched or clearly noticed'],
  ['theoretical', 'adjective', 'advanced', 'academic', 'based on ideas rather than practical use'],
  ['transition', 'noun', 'upper_intermediate', 'work', 'a change from one state or stage to another'],
  ['undermine', 'verb', 'upper_intermediate', 'relationships', 'to weaken support, trust, or confidence'],
  ['utility', 'noun', 'advanced', 'professional', 'practical usefulness'],
  ['validate', 'verb', 'upper_intermediate', 'academic', 'to confirm that something is sound or acceptable'],
  ['viability', 'noun', 'advanced', 'work', 'the ability to succeed or continue'],
  ['abrupt', 'adjective', 'intermediate', 'descriptive', 'sudden or unexpectedly direct'],
  ['absorb', 'verb', 'intermediate', 'education', 'to take in information, energy, or material'],
  ['accelerate', 'verb', 'upper_intermediate', 'technology', 'to make something happen faster'],
  ['accessible', 'adjective', 'intermediate', 'technology', 'easy to reach, use, or understand'],
  ['accommodate', 'verb', 'upper_intermediate', 'relationships', 'to make space for a need or request'],
  ['accumulate', 'verb', 'upper_intermediate', 'work', 'to gather gradually over time'],
  ['adaptable', 'adjective', 'intermediate', 'personality', 'able to adjust to new conditions'],
  ['adjacent', 'adjective', 'intermediate', 'descriptive', 'next to or near something'],
  ['advancement', 'noun', 'intermediate', 'professional', 'progress toward a better position or state'],
  ['adversity', 'noun', 'upper_intermediate', 'emotions', 'serious difficulty or misfortune'],
  ['advise', 'verb', 'elementary', 'communication', 'to give guidance or suggestions'],
  ['aesthetic', 'adjective', 'advanced', 'culture', 'related to beauty or artistic taste'],
  ['affection', 'noun', 'intermediate', 'relationships', 'a warm feeling of care or fondness'],
  ['agenda', 'noun', 'intermediate', 'work', 'a list of things to discuss or achieve'],
  ['agile', 'adjective', 'upper_intermediate', 'professional', 'able to move or adapt quickly'],
  ['alleviate', 'verb', 'advanced', 'health', 'to make pain or difficulty less severe'],
  ['allocate', 'verb', 'upper_intermediate', 'work', 'to set aside resources for a purpose'],
  ['ambition', 'noun', 'intermediate', 'personality', 'a strong desire to achieve something'],
  ['amplify', 'verb', 'upper_intermediate', 'communication', 'to make something stronger, louder, or more noticeable'],
  ['analytical', 'adjective', 'upper_intermediate', 'thinking', 'skilled at studying parts and patterns'],
  ['anchor', 'verb', 'intermediate', 'communication', 'to hold an idea or plan steady'],
  ['appreciation', 'noun', 'intermediate', 'emotions', 'recognition of value or gratitude'],
  ['artistry', 'noun', 'upper_intermediate', 'culture', 'creative skill in making or performing something'],
  ['aspiration', 'noun', 'upper_intermediate', 'personality', 'a hope or aim for future achievement'],
  ['assurance', 'noun', 'intermediate', 'communication', 'confidence or a promise that reduces doubt'],
  ['attentive', 'adjective', 'intermediate', 'relationships', 'paying close and considerate attention'],
  ['authenticity', 'noun', 'upper_intermediate', 'personality', 'the quality of being genuine and truthful'],
  ['availability', 'noun', 'intermediate', 'work', 'the state of being ready or able to be used'],
  ['baseline', 'noun', 'upper_intermediate', 'academic', 'a starting point used for comparison'],
  ['brevity', 'noun', 'upper_intermediate', 'communication', 'the quality of being brief and clear'],
  ['burden', 'noun', 'intermediate', 'emotions', 'something difficult to carry or manage'],
  ['catalyst', 'noun', 'advanced', 'science', 'something that causes or speeds up change'],
  ['caution', 'noun', 'intermediate', 'thinking', 'care taken to avoid danger or mistakes'],
  ['clarity', 'noun', 'intermediate', 'communication', 'the quality of being easy to understand'],
  ['coincide', 'verb', 'upper_intermediate', 'thinking', 'to happen at the same time or agree'],
  ['comfort', 'noun', 'beginner', 'emotions', 'a feeling of ease or relief'],
  ['communal', 'adjective', 'upper_intermediate', 'society', 'shared by members of a community'],
  ['compatible', 'adjective', 'upper_intermediate', 'relationships', 'able to exist or work together without conflict'],
  ['complement', 'verb', 'upper_intermediate', 'descriptive', 'to add something that improves or completes another thing'],
  ['compound', 'verb', 'upper_intermediate', 'thinking', 'to make a problem stronger or more serious'],
  ['conceal', 'verb', 'intermediate', 'communication', 'to hide or keep something from being known'],
  ['concentrate', 'verb', 'elementary', 'thinking', 'to give focused attention'],
  ['conditional', 'adjective', 'upper_intermediate', 'academic', 'depending on something else'],
  ['conflict', 'noun', 'intermediate', 'relationships', 'a serious disagreement or struggle'],
  ['consensus', 'noun', 'upper_intermediate', 'society', 'general agreement among a group'],
  ['continuity', 'noun', 'advanced', 'work', 'steady connection or progress over time'],
  ['contradict', 'verb', 'upper_intermediate', 'communication', 'to say or show the opposite'],
  ['controversial', 'adjective', 'upper_intermediate', 'society', 'causing strong disagreement'],
  ['conventional', 'adjective', 'upper_intermediate', 'culture', 'following accepted customs or methods'],
  ['correlate', 'verb', 'advanced', 'science', 'to show a relationship between two things'],
  ['courteous', 'adjective', 'intermediate', 'relationships', 'polite and respectful'],
  ['credibility', 'noun', 'upper_intermediate', 'academic', 'the quality of being believable or trusted'],
  ['cultured', 'adjective', 'upper_intermediate', 'culture', 'showing education, refinement, or artistic awareness'],
  ['curiosity', 'noun', 'intermediate', 'education', 'a desire to learn or know more'],
  ['decisive', 'adjective', 'intermediate', 'personality', 'able to make decisions clearly and quickly'],
  ['deduction', 'noun', 'upper_intermediate', 'thinking', 'a conclusion reached from evidence or rules'],
  ['deficiency', 'noun', 'advanced', 'health', 'a lack of something necessary'],
  ['delicate', 'adjective', 'intermediate', 'descriptive', 'easily damaged or requiring careful handling'],
  ['demanding', 'adjective', 'intermediate', 'work', 'requiring much effort or skill'],
  ['demographic', 'adjective', 'advanced', 'society', 'related to the structure of a population'],
  ['dense', 'adjective', 'intermediate', 'descriptive', 'closely packed or difficult to get through'],
  ['dependence', 'noun', 'upper_intermediate', 'relationships', 'a state of relying on someone or something'],
  ['designate', 'verb', 'upper_intermediate', 'professional', 'to officially choose or name'],
  ['dialogue', 'noun', 'intermediate', 'communication', 'a conversation or exchange of ideas'],
  ['dimension', 'noun', 'upper_intermediate', 'thinking', 'one aspect or measurable part of something'],
  ['discern', 'verb', 'advanced', 'thinking', 'to notice or understand with careful judgment'],
  ['discipline', 'noun', 'intermediate', 'education', 'training, control, or a field of study'],
  ['displacement', 'noun', 'advanced', 'society', 'being forced or moved from a usual place'],
  ['disposition', 'noun', 'advanced', 'personality', 'a usual mood or tendency'],
  ['distinction', 'noun', 'upper_intermediate', 'academic', 'a clear difference between things'],
  ['dynamic', 'adjective', 'intermediate', 'descriptive', 'active, changing, or full of energy'],
  ['earnest', 'adjective', 'upper_intermediate', 'personality', 'serious and sincere'],
  ['ecological', 'adjective', 'advanced', 'nature', 'related to living things and their environment'],
  ['elevate', 'verb', 'upper_intermediate', 'professional', 'to raise quality, status, or importance'],
  ['eligible', 'adjective', 'intermediate', 'society', 'allowed or qualified to receive or do something'],
  ['eloquent', 'adjective', 'advanced', 'communication', 'expressing ideas beautifully and persuasively'],
  ['embody', 'verb', 'upper_intermediate', 'culture', 'to represent an idea or quality clearly'],
  ['emotional', 'adjective', 'elementary', 'emotions', 'related to feelings'],
  ['endure', 'verb', 'upper_intermediate', 'personality', 'to continue through difficulty'],
  ['engagement', 'noun', 'intermediate', 'communication', 'active interest or participation'],
  ['enrich', 'verb', 'intermediate', 'education', 'to improve by adding value or depth'],
  ['equilibrium', 'noun', 'advanced', 'science', 'a balanced and steady state'],
  ['ethical', 'adjective', 'intermediate', 'society', 'related to right, fair, or responsible conduct'],
  ['evaluate', 'verb', 'intermediate', 'academic', 'to judge quality or value carefully'],
  ['evident', 'adjective', 'intermediate', 'communication', 'easy to see or understand'],
  ['exclude', 'verb', 'intermediate', 'society', 'to leave someone or something out'],
  ['exert', 'verb', 'upper_intermediate', 'work', 'to apply effort, force, or influence'],
  ['exposure', 'noun', 'intermediate', 'education', 'contact with an idea, experience, or risk'],
  ['expressive', 'adjective', 'intermediate', 'communication', 'showing thoughts or feelings clearly'],
  ['extent', 'noun', 'intermediate', 'academic', 'the amount, range, or degree of something'],
  ['factual', 'adjective', 'intermediate', 'academic', 'based on facts'],
  ['fluctuate', 'verb', 'advanced', 'science', 'to rise and fall or change repeatedly'],
  ['foresight', 'noun', 'advanced', 'thinking', 'the ability to prepare for what may happen'],
  ['frank', 'adjective', 'intermediate', 'communication', 'honest and direct'],
  ['friction', 'noun', 'upper_intermediate', 'relationships', 'tension or difficulty between people or parts'],
  ['fulfill', 'verb', 'intermediate', 'work', 'to complete or satisfy a duty, need, or promise'],
  ['gesture', 'noun', 'intermediate', 'communication', 'an action that expresses meaning or feeling'],
  ['gradual', 'adjective', 'intermediate', 'descriptive', 'happening slowly in small steps'],
  ['gracious', 'adjective', 'upper_intermediate', 'personality', 'kind, polite, and generous in manner'],
  ['habitual', 'adjective', 'upper_intermediate', 'everyday_life', 'done regularly as a habit'],
  ['hesitation', 'noun', 'intermediate', 'emotions', 'a pause caused by uncertainty'],
  ['hostile', 'adjective', 'intermediate', 'relationships', 'unfriendly or opposed'],
  ['humility', 'noun', 'upper_intermediate', 'personality', 'modesty about importance or ability'],
  ['ideal', 'adjective', 'elementary', 'descriptive', 'best suited for a purpose'],
  ['illustration', 'noun', 'intermediate', 'communication', 'an example or image that explains something'],
  ['immediate', 'adjective', 'elementary', 'everyday_life', 'happening without delay'],
  ['impartial', 'adjective', 'upper_intermediate', 'society', 'fair and not favoring one side'],
  ['inclusion', 'noun', 'intermediate', 'society', 'the act of making people part of a group'],
  ['independent', 'adjective', 'intermediate', 'personality', 'able to act or think without relying on others'],
  ['indicator', 'noun', 'upper_intermediate', 'academic', 'a sign that shows a condition or trend'],
  ['inefficient', 'adjective', 'intermediate', 'work', 'wasting time, energy, or resources'],
  ['inference', 'noun', 'upper_intermediate', 'thinking', 'a conclusion based on evidence'],
  ['informative', 'adjective', 'intermediate', 'communication', 'providing useful information'],
  ['inhibit', 'verb', 'advanced', 'emotions', 'to slow down, limit, or prevent'],
  ['insufficient', 'adjective', 'intermediate', 'work', 'not enough for what is needed'],
  ['intention', 'noun', 'intermediate', 'thinking', 'a plan or purpose behind an action'],
  ['intuitive', 'adjective', 'upper_intermediate', 'thinking', 'understood naturally without detailed explanation'],
  ['investment', 'noun', 'intermediate', 'professional', 'time, money, or effort used for future benefit'],
  ['irregular', 'adjective', 'intermediate', 'descriptive', 'not following a usual pattern'],
  ['isolate', 'verb', 'upper_intermediate', 'science', 'to separate something from others'],
  ['joint', 'adjective', 'elementary', 'work', 'shared by two or more people'],
  ['keen', 'adjective', 'intermediate', 'personality', 'strongly interested or sharp in ability'],
  ['latent', 'adjective', 'advanced', 'thinking', 'present but not yet visible or active'],
  ['literal', 'adjective', 'intermediate', 'communication', 'using the exact basic meaning of words'],
  ['loyal', 'adjective', 'elementary', 'relationships', 'faithful and supportive'],
  ['mature', 'adjective', 'intermediate', 'personality', 'showing good judgment and emotional development'],
  ['maximize', 'verb', 'upper_intermediate', 'work', 'to make as large or effective as possible'],
  ['memorable', 'adjective', 'intermediate', 'culture', 'easy to remember because it is special'],
  ['minimal', 'adjective', 'intermediate', 'descriptive', 'very small in amount or degree'],
  ['misinterpret', 'verb', 'upper_intermediate', 'communication', 'to understand something incorrectly'],
  ['momentum', 'noun', 'upper_intermediate', 'work', 'the force that keeps progress moving'],
  ['negotiate', 'verb', 'upper_intermediate', 'relationships', 'to discuss terms to reach agreement'],
  ['neutral', 'adjective', 'intermediate', 'communication', 'not supporting either side'],
  ['obscure', 'adjective', 'upper_intermediate', 'interesting_words', 'not well known or hard to understand'],
  ['ongoing', 'adjective', 'intermediate', 'work', 'continuing without being finished yet'],
  ['optimal', 'adjective', 'upper_intermediate', 'professional', 'best or most effective'],
  ['orientation', 'noun', 'upper_intermediate', 'education', 'an introduction to a new place, idea, or role'],
  ['outcome', 'noun', 'intermediate', 'thinking', 'the final result of a process'],
  ['overlap', 'noun', 'upper_intermediate', 'thinking', 'an area where things share features'],
  ['persevere', 'verb', 'upper_intermediate', 'personality', 'to keep going despite difficulty'],
  ['phenomenon', 'noun', 'advanced', 'science', 'an event or fact that can be observed'],
  ['pioneer', 'verb', 'advanced', 'technology', 'to be among the first to develop or use something'],
  ['polished', 'adjective', 'upper_intermediate', 'professional', 'refined and skillfully finished'],
  ['preliminary', 'adjective', 'upper_intermediate', 'academic', 'coming before the main or final stage'],
  ['principle', 'noun', 'intermediate', 'society', 'a basic belief or rule guiding behavior'],
  ['proactive', 'adjective', 'upper_intermediate', 'professional', 'acting early to create or prevent change'],
  ['procedure', 'noun', 'intermediate', 'work', 'an established way to do something'],
  ['prominent', 'adjective', 'upper_intermediate', 'society', 'important or easily noticed'],
  ['provoke', 'verb', 'upper_intermediate', 'emotions', 'to cause a reaction or feeling'],
  ['pursue', 'verb', 'intermediate', 'professional', 'to try to achieve or follow something'],
  ['qualify', 'verb', 'intermediate', 'education', 'to meet the conditions needed for something'],
  ['random', 'adjective', 'elementary', 'thinking', 'without a clear pattern or plan'],
  ['rapport', 'noun', 'advanced', 'relationships', 'a friendly and trusting connection'],
  ['realistic', 'adjective', 'intermediate', 'thinking', 'based on what is practical or likely'],
  ['reassure', 'verb', 'intermediate', 'emotions', 'to reduce worry by giving confidence'],
  ['recipient', 'noun', 'upper_intermediate', 'society', 'a person who receives something'],
  ['recover', 'verb', 'elementary', 'health', 'to return to a better state after difficulty'],
  ['reform', 'noun', 'upper_intermediate', 'society', 'a change intended to improve a system'],
  ['regulate', 'verb', 'upper_intermediate', 'society', 'to control by rules or adjustment'],
  ['relevance', 'noun', 'intermediate', 'communication', 'connection to the matter being discussed'],
  ['resistance', 'noun', 'intermediate', 'society', 'refusal to accept or be changed by something'],
  ['resource', 'noun', 'elementary', 'work', 'something useful for achieving a goal'],
  ['retain', 'verb', 'intermediate', 'education', 'to keep or remember something'],
  ['revise', 'verb', 'intermediate', 'education', 'to improve by reviewing and changing'],
  ['robust', 'adjective', 'upper_intermediate', 'technology', 'strong and able to work under pressure'],
  ['sensitive', 'adjective', 'intermediate', 'relationships', 'aware of feelings or easily affected'],
  ['sequence', 'noun', 'intermediate', 'thinking', 'an ordered series of things'],
  ['shortcoming', 'noun', 'upper_intermediate', 'professional', 'a weakness or limitation'],
  ['sincere', 'adjective', 'intermediate', 'personality', 'honest in feeling or intention'],
  ['skepticism', 'noun', 'upper_intermediate', 'thinking', 'doubt until evidence is clear'],
  ['solidarity', 'noun', 'advanced', 'society', 'unity and mutual support within a group'],
  ['specification', 'noun', 'advanced', 'technology', 'a precise description of requirements'],
  ['spontaneous', 'adjective', 'upper_intermediate', 'personality', 'done naturally without planning'],
  ['stimulate', 'verb', 'upper_intermediate', 'education', 'to encourage activity or interest'],
  ['straightforward', 'adjective', 'intermediate', 'communication', 'clear and easy to understand'],
  ['strategize', 'verb', 'advanced', 'professional', 'to plan carefully toward a goal'],
  ['subjectivity', 'noun', 'advanced', 'thinking', 'judgment shaped by personal views'],
  ['sufficient', 'adjective', 'intermediate', 'work', 'enough for a purpose'],
  ['symbolic', 'adjective', 'upper_intermediate', 'culture', 'representing a larger idea or meaning'],
  ['tact', 'noun', 'upper_intermediate', 'relationships', 'skill in saying difficult things kindly'],
  ['temporary', 'adjective', 'elementary', 'everyday_life', 'lasting for a limited time'],
  ['thrive', 'verb', 'intermediate', 'health', 'to grow or do very well'],
  ['tolerate', 'verb', 'intermediate', 'relationships', 'to accept something difficult or unpleasant'],
  ['transparent', 'adjective', 'intermediate', 'professional', 'open and easy to understand'],
  ['trend', 'noun', 'intermediate', 'society', 'a general direction of change'],
  ['unify', 'verb', 'upper_intermediate', 'society', 'to bring separate parts together'],
  ['unique', 'adjective', 'elementary', 'descriptive', 'different from all others'],
  ['urgent', 'adjective', 'elementary', 'work', 'needing quick attention'],
  ['variation', 'noun', 'intermediate', 'descriptive', 'a difference or change in form'],
  ['verify', 'verb', 'intermediate', 'academic', 'to check that something is true or accurate'],
  ['vibrant', 'adjective', 'intermediate', 'descriptive', 'full of energy, color, or life'],
  ['vulnerable', 'adjective', 'upper_intermediate', 'emotions', 'open to harm, criticism, or emotional risk'],
  ['welfare', 'noun', 'intermediate', 'society', 'health, safety, and general wellbeing'],
  ['withdraw', 'verb', 'intermediate', 'emotions', 'to pull back from contact or involvement'],
  ['yield', 'verb', 'upper_intermediate', 'academic', 'to produce a result or give way'],
  ['abundant', 'adjective', 'upper_intermediate', 'nature', 'existing in large amounts'],
  ['accelerated', 'adjective', 'upper_intermediate', 'education', 'happening faster than usual'],
  ['accountability', 'noun', 'upper_intermediate', 'professional', 'responsibility for explaining actions and results'],
  ['acquire', 'verb', 'intermediate', 'education', 'to gain knowledge, skill, or ownership'],
  ['adverse', 'adjective', 'upper_intermediate', 'health', 'harmful or unfavorable'],
  ['advocacy', 'noun', 'upper_intermediate', 'society', 'public support for a cause or policy'],
  ['affirmation', 'noun', 'upper_intermediate', 'emotions', 'a statement of support or confidence'],
  ['agency', 'noun', 'advanced', 'society', 'the capacity to act and make choices'],
  ['aggregate', 'noun', 'advanced', 'academic', 'a total formed from separate parts'],
  ['alienate', 'verb', 'upper_intermediate', 'relationships', 'to make someone feel isolated or unwelcome'],
  ['ambivalent', 'adjective', 'advanced', 'emotions', 'having mixed or opposing feelings'],
  ['amend', 'verb', 'upper_intermediate', 'professional', 'to change something in order to improve it'],
  ['appraise', 'verb', 'advanced', 'professional', 'to judge value or quality'],
  ['approximate', 'adjective', 'upper_intermediate', 'academic', 'close to the real amount but not exact'],
  ['articulation', 'noun', 'upper_intermediate', 'communication', 'clear expression of ideas or sounds'],
  ['assertion', 'noun', 'upper_intermediate', 'communication', 'a confident statement of belief or fact'],
  ['attain', 'verb', 'upper_intermediate', 'professional', 'to reach or achieve something'],
  ['attribute', 'noun', 'upper_intermediate', 'descriptive', 'a quality or feature of someone or something'],
  ['benefit', 'noun', 'elementary', 'work', 'a useful or positive result'],
  ['capability', 'noun', 'upper_intermediate', 'professional', 'the power or skill to do something'],
  ['civic', 'adjective', 'upper_intermediate', 'society', 'related to citizens or community life'],
  ['coexist', 'verb', 'upper_intermediate', 'society', 'to exist together at the same time'],
  ['commence', 'verb', 'advanced', 'professional', 'to begin formally'],
  ['competence', 'noun', 'upper_intermediate', 'professional', 'the ability to do something well'],
  ['compliance', 'noun', 'advanced', 'professional', 'the act of following rules or requirements'],
  ['concession', 'noun', 'advanced', 'relationships', 'something given up to reach agreement'],
  ['conducive', 'adjective', 'advanced', 'education', 'helping something happen or succeed'],
  ['confide', 'verb', 'upper_intermediate', 'relationships', 'to share private thoughts with trust'],
  ['conform', 'verb', 'upper_intermediate', 'society', 'to follow rules, customs, or expectations'],
  ['connotation', 'noun', 'advanced', 'communication', 'an extra feeling or idea connected with a word'],
  ['constituent', 'noun', 'advanced', 'society', 'a part of a whole or a represented citizen'],
  ['contingent', 'adjective', 'advanced', 'thinking', 'depending on something else'],
  ['convergence', 'noun', 'advanced', 'science', 'the movement of separate things toward one point or idea'],
  ['conviction', 'noun', 'upper_intermediate', 'personality', 'a strong belief or certainty'],
  ['cumulative', 'adjective', 'advanced', 'academic', 'increasing by adding parts over time'],
  ['deference', 'noun', 'advanced', 'relationships', 'respect shown for another person or judgment'],
  ['delineate', 'verb', 'expert', 'academic', 'to describe or mark the exact limits of something'],
  ['denote', 'verb', 'advanced', 'communication', 'to directly mean or indicate'],
  ['deviation', 'noun', 'advanced', 'academic', 'a difference from a standard or expected path'],
  ['diffuse', 'verb', 'advanced', 'science', 'to spread out over a wide area'],
  ['discerning', 'adjective', 'advanced', 'thinking', 'showing careful and good judgment'],
  ['disparity', 'noun', 'advanced', 'society', 'a noticeable and often unfair difference'],
  ['divergent', 'adjective', 'advanced', 'thinking', 'moving or developing in different directions'],
  ['eloquence', 'noun', 'advanced', 'communication', 'powerful and graceful expression'],
  ['embellish', 'verb', 'advanced', 'communication', 'to add details that make something more decorative or dramatic'],
  ['emulate', 'verb', 'advanced', 'education', 'to try to match or improve on an example'],
  ['encompass', 'verb', 'advanced', 'academic', 'to include a wide range of things'],
  ['enduring', 'adjective', 'upper_intermediate', 'culture', 'lasting for a long time'],
  ['equivocal', 'adjective', 'expert', 'communication', 'unclear because it can mean more than one thing'],
  ['erudite', 'adjective', 'expert', 'academic', 'having deep scholarly knowledge'],
  ['exacting', 'adjective', 'advanced', 'professional', 'requiring great care and precision'],
  ['extrapolate', 'verb', 'expert', 'academic', 'to estimate beyond known information'],
  ['formidable', 'adjective', 'advanced', 'descriptive', 'impressive and difficult to deal with'],
  ['galvanize', 'verb', 'advanced', 'society', 'to strongly motivate people to act'],
  ['holistic', 'adjective', 'advanced', 'health', 'considering the whole rather than only parts'],
  ['imperative', 'adjective', 'advanced', 'professional', 'extremely important and urgent'],
  ['indispensable', 'adjective', 'advanced', 'professional', 'so useful or important that it is necessary'],
  ['inferential', 'adjective', 'expert', 'academic', 'based on conclusions drawn from evidence'],
  ['insightful', 'adjective', 'upper_intermediate', 'thinking', 'showing deep understanding'],
  ['interdependence', 'noun', 'expert', 'society', 'mutual reliance between people, systems, or groups'],
  ['juxtapose', 'verb', 'expert', 'academic', 'to place things side by side for comparison'],
  ['legitimate', 'adjective', 'upper_intermediate', 'society', 'valid, lawful, or reasonable'],
  ['metaphor', 'noun', 'upper_intermediate', 'communication', 'a word or image used to suggest a comparison'],
  ['nuanced', 'adjective', 'upper_intermediate', 'communication', 'showing small but important distinctions'],
  ['paradigm', 'noun', 'advanced', 'thinking', 'a model or pattern for understanding something'],
  ['peripheral', 'adjective', 'advanced', 'thinking', 'less central or only on the edge'],
  ['prerequisite', 'noun', 'advanced', 'education', 'something required before another thing can happen'],
  ['proximity', 'noun', 'upper_intermediate', 'descriptive', 'nearness in space, time, or relationship'],
  ['reconcile', 'verb', 'advanced', 'relationships', 'to restore agreement or make ideas fit together'],
  ['reframe', 'verb', 'upper_intermediate', 'thinking', 'to present an idea in a new way'],
  ['salient', 'adjective', 'expert', 'academic', 'most noticeable or important'],
  ['skeptical', 'adjective', 'upper_intermediate', 'thinking', 'not easily convinced without evidence'],
  ['sophisticated', 'adjective', 'advanced', 'descriptive', 'complex, refined, or highly developed'],
  ['substantiate', 'verb', 'expert', 'academic', 'to support a claim with evidence'],
  ['synthesize', 'verb', 'advanced', 'academic', 'to combine ideas into a clear whole'],
  ['tactful', 'adjective', 'upper_intermediate', 'relationships', 'careful not to offend or upset others'],
  ['underpin', 'verb', 'expert', 'thinking', 'to support or form the basis of something'],
  ['unprecedented', 'adjective', 'advanced', 'society', 'never known or done before'],
  ['versatility', 'noun', 'upper_intermediate', 'professional', 'the ability to adapt to many uses'],
  ['vigilant', 'adjective', 'advanced', 'health', 'watchful and alert to possible danger'],
];

function exampleFor(entry) {
  const [word, partOfSpeech, , category] = entry;
  if (partOfSpeech === 'verb') {
    return `They used the word ${word} while explaining how to handle the situation.`;
  }
  if (partOfSpeech === 'adjective') {
    return `The ${word} response made the conversation easier to understand.`;
  }
  if (partOfSpeech === 'adverb') {
    return `She explained the result ${word} so the team could trust it.`;
  }
  return `The idea of ${word} appears often in ${category.replace('_', ' ')} discussions.`;
}

function synonymsFor(word, meaning) {
  const words = meaning
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((part) => part.length > 4 && part !== word)
    .slice(0, 2);
  return words.length > 0 ? words : [];
}

function antonymsFor(partOfSpeech) {
  if (partOfSpeech === 'adjective') return ['opposite'];
  if (partOfSpeech === 'verb') return ['avoid'];
  return [];
}

function recordFromEntry(entry) {
  const [word, partOfSpeech, difficultyLevel, category, meaning] = entry;
  return normalizeRecord({
    word,
    part_of_speech: partOfSpeech,
    difficulty_level: difficultyLevel,
    category,
    frequency_score: difficultyLevel === 'beginner' ? 84 : difficultyLevel === 'elementary' ? 76 : difficultyLevel === 'intermediate' ? 66 : difficultyLevel === 'upper_intermediate' ? 52 : difficultyLevel === 'advanced' ? 38 : 22,
    usefulness_score: difficultyLevel === 'expert' ? 72 : difficultyLevel === 'advanced' ? 80 : difficultyLevel === 'upper_intermediate' ? 84 : 88,
    definition: meaning.charAt(0).toUpperCase() + meaning.slice(1) + '.',
    example_sentence: exampleFor(entry),
    pronunciation: `/${word.toLowerCase().replace(/ /g, '-').replace(/[^a-z-]/g, '')}/`,
    pronunciation_audio_url: null,
    synonyms: synonymsFor(word, meaning),
    antonyms: antonymsFor(partOfSpeech),
    status: 'approved',
  });
}

function distribution(records, field) {
  return records.reduce((totals, record) => {
    totals[record[field]] = (totals[record[field]] ?? 0) + 1;
    return totals;
  }, {});
}

function chooseUnusedWord(words, used, plan, dayNumber) {
  const exact = words.find((word) => (
    !used.has(word.normalized_word) &&
    plan.categories.includes(word.category) &&
    plan.difficulties.includes(word.difficulty_level)
  ));
  if (exact) return exact;

  const categoryOnly = words.find((word) => !used.has(word.normalized_word) && plan.categories.includes(word.category));
  if (categoryOnly) return categoryOnly;

  return words.find((word) => !used.has(word.normalized_word) && word.status === 'approved') ?? null;
}

function lessonTypeFor(word, dayNumber) {
  if (dayNumber % 14 === 0) return 'review';
  if (word.difficulty_level === 'advanced' || word.difficulty_level === 'expert') return 'advanced';
  return lessonTypeByCategory[word.category] ?? 'learn';
}

function buildCurriculum(allRecords, first20Records) {
  const approvedWords = allRecords.filter((record) => record.status === 'approved');
  const used = new Set(first20Records.map((record) => record.normalized_word));
  const curriculum = first20Records.map((record) => ({ ...record }));

  for (const plan of stagePlans) {
    for (let day = plan.start; day <= plan.end; day += 1) {
      const word = chooseUnusedWord(approvedWords, used, plan, day);
      if (!word) {
        throw new Error(`No approved unused word available for day ${day}`);
      }

      used.add(word.normalized_word);
      const theme = plan.themes[(day - plan.start) % plan.themes.length] ?? categoryToTheme[word.category];
      curriculum.push({
        day_number: day,
        normalized_word: word.normalized_word,
        theme,
        lesson_type: lessonTypeFor(word, day),
        difficulty_level: word.difficulty_level,
        status: 'approved',
      });
    }
  }

  if (curriculum.length !== TARGET_CURRICULUM_DAYS) {
    throw new Error(`Expected ${TARGET_CURRICULUM_DAYS} curriculum days, got ${curriculum.length}`);
  }

  return curriculum.sort((a, b) => a.day_number - b.day_number);
}

async function readRecords(path) {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.records ?? [];
}

export async function buildPhase3Vocabulary({
  wordBankPath = 'data/word-bank-candidates.json',
  first20Path = 'data/wordup-curriculum-first-20.json',
  curriculumPath = 'data/wordup-curriculum-365.json',
} = {}) {
  const existingRecords = await readRecords(wordBankPath);
  const first20Records = await readRecords(first20Path);
  const protectedWords = new Set([
    ...existingRecords.slice(0, 100).map((record) => record.normalized_word),
    ...first20Records.map((record) => record.normalized_word),
  ]);
  const byWord = new Map(existingRecords.map((record) => [record.normalized_word, record]));
  let approvedCount = existingRecords.filter((record) => record.status === 'approved').length;

  for (const entry of expansionEntries) {
    const record = recordFromEntry(entry);
    if (byWord.has(record.normalized_word)) continue;
    const currentExpertCount = [...byWord.values()].filter((word) => word.status === 'approved' && word.difficulty_level === 'expert').length;
    const remainingSlots = TARGET_APPROVED_WORDS - approvedCount;
    const expertSlotsNeeded = Math.max(0, MIN_EXPERT_WORDS - currentExpertCount);
    if (approvedCount >= TARGET_APPROVED_WORDS) break;
    if (record.difficulty_level !== 'expert' && expertSlotsNeeded >= remainingSlots) continue;
    byWord.set(record.normalized_word, record);
    approvedCount += 1;
  }

  let expertCount = [...byWord.values()].filter((word) => word.status === 'approved' && word.difficulty_level === 'expert').length;
  for (const entry of expansionEntries.filter((item) => item[2] === 'expert')) {
    if (expertCount >= MIN_EXPERT_WORDS) break;
    const record = recordFromEntry(entry);
    if (byWord.has(record.normalized_word)) continue;
    byWord.set(record.normalized_word, record);
    approvedCount += 1;
    expertCount += 1;
  }

  while (approvedCount > TARGET_APPROVED_WORDS) {
    const removable = [...byWord.values()].reverse().find((record) => (
      record.status === 'approved' &&
      record.difficulty_level !== 'expert' &&
      !protectedWords.has(record.normalized_word)
    ));
    if (!removable) {
      throw new Error('Could not trim generated vocabulary without touching protected words');
    }
    byWord.delete(removable.normalized_word);
    approvedCount -= 1;
  }

  const records = [...byWord.values()];
  if (records.filter((record) => record.status === 'approved').length !== TARGET_APPROVED_WORDS) {
    throw new Error(`Expected ${TARGET_APPROVED_WORDS} approved words, got ${approvedCount}`);
  }

  const validation = validateWordBankRecords(records);
  if (validation.rejected.length > 0) {
    throw new Error(`Word bank validation failed: ${JSON.stringify(validation.rejected.slice(0, 5))}`);
  }

  const curriculum = buildCurriculum(records, first20Records);
  const generatedAt = new Date().toISOString();

  await writeFile(wordBankPath, `${JSON.stringify({
    generatedAt,
    source: 'phase-3-curated-wordup-vocabulary',
    targetApprovedCount: TARGET_APPROVED_WORDS,
    totalCount: records.length,
    approvedCount: records.filter((record) => record.status === 'approved').length,
    rejectedCount: 0,
    difficultyDistribution: distribution(records.filter((record) => record.status === 'approved'), 'difficulty_level'),
    categoryDistribution: distribution(records.filter((record) => record.status === 'approved'), 'category'),
    records,
    rejected: [],
  }, null, 2)}\n`);

  await writeFile(curriculumPath, `${JSON.stringify({
    generatedAt,
    source: 'phase-3-first-year-curriculum',
    totalDays: curriculum.length,
    records: curriculum,
  }, null, 2)}\n`);

  return { records, curriculum };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildPhase3Vocabulary()
    .then(({ records, curriculum }) => {
      const approved = records.filter((record) => record.status === 'approved');
      console.log(`Approved word bank records: ${approved.length}`);
      console.log(`Total word bank records: ${records.length}`);
      console.log(`Curriculum days: ${curriculum.length}`);
      console.log(`Word difficulty: ${JSON.stringify(distribution(approved, 'difficulty_level'))}`);
      console.log(`Word categories: ${JSON.stringify(distribution(approved, 'category'))}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
