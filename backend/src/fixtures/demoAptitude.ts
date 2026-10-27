export interface DemoQuestion {
  topicName: 'Quantitative Aptitude' | 'Logical Reasoning' | 'Verbal Ability';
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  recompute?: () => { expectedValue: string | number; matchedOption: 'A' | 'B' | 'C' | 'D' };
}

export const demoAptitudeQuestions: DemoQuestion[] = [
  // =========================================================================
  // QUANTITATIVE APTITUDE (17 questions: 7 easy, 7 medium, 3 hard)
  // =========================================================================
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'A train 180 meters long is traveling at a speed of 72 km/h. How many seconds will it take to pass a stationary signal pole?',
    optionA: '8 seconds',
    optionB: '9 seconds',
    optionC: '10 seconds',
    optionD: '12 seconds',
    correctOption: 'B',
    explanation: 'Speed in m/s = 72 * (5/18) = 20 m/s. Time to pass the pole = Distance / Speed = 180 / 20 = 9 seconds.',
    recompute: () => {
      const val = 180 / (72 * (5 / 18));
      return { expectedValue: `${val} seconds`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'A student scored 340 marks out of a total of 500 in an examination. What percentage of marks did the student obtain?',
    optionA: '65%',
    optionB: '68%',
    optionC: '70%',
    optionD: '72%',
    correctOption: 'B',
    explanation: 'Percentage = (Marks obtained / Total marks) * 100 = (340 / 500) * 100 = 68%.',
    recompute: () => {
      const val = (340 / 500) * 100;
      return { expectedValue: `${val}%`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'An article bought for Rs. 450 is sold for Rs. 540. What is the profit percentage earned on the transaction?',
    optionA: '15%',
    optionB: '18%',
    optionC: '20%',
    optionD: '25%',
    correctOption: 'C',
    explanation: 'Profit = Selling Price - Cost Price = 540 - 450 = Rs. 90. Profit % = (90 / 450) * 100 = 20%.',
    recompute: () => {
      const val = ((540 - 450) / 450) * 100;
      return { expectedValue: `${val}%`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'Find the simple interest accrued on a principal of Rs. 5000 invested at 8% per annum for a period of 3 years.',
    optionA: 'Rs. 1000',
    optionB: 'Rs. 1100',
    optionC: 'Rs. 1200',
    optionD: 'Rs. 1400',
    correctOption: 'C',
    explanation: 'Simple Interest = (Principal * Rate * Time) / 100 = (5000 * 8 * 3) / 100 = Rs. 1200.',
    recompute: () => {
      const val = (5000 * 8 * 3) / 100;
      return { expectedValue: `Rs. ${val}`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'Worker A can finish a task in 12 days and Worker B can finish the same task in 24 days. Working together, in how many days can they complete the task?',
    optionA: '6 days',
    optionB: '8 days',
    optionC: '9 days',
    optionD: '10 days',
    correctOption: 'B',
    explanation: 'Combined 1-day work = 1/12 + 1/24 = 3/24 = 1/8. Total days required = 8 days.',
    recompute: () => {
      const val = 1 / (1 / 12 + 1 / 24);
      return { expectedValue: `${val} days`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'In a 40-liter mixture of milk and water, the ratio of milk to water is 5:3. How many liters of milk are present in the mixture?',
    optionA: '20 liters',
    optionB: '24 liters',
    optionC: '25 liters',
    optionD: '30 liters',
    correctOption: 'C',
    explanation: 'Milk portion = 5 / (5 + 3) = 5/8. Volume of milk = 40 * (5/8) = 25 liters.',
    recompute: () => {
      const val = 40 * (5 / (5 + 3));
      return { expectedValue: `${val} liters`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'easy',
    questionText: 'What is the arithmetic mean of the five observations: 14, 22, 28, 36, and 40?',
    optionA: '26',
    optionB: '28',
    optionC: '30',
    optionD: '32',
    correctOption: 'B',
    explanation: 'Sum = 14 + 22 + 28 + 36 + 40 = 140. Average = 140 / 5 = 28.',
    recompute: () => {
      const val = (14 + 22 + 28 + 36 + 40) / 5;
      return { expectedValue: `${val}`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'Calculate the compound interest on Rs. 8000 for 2 years at 10% per annum compounded annually.',
    optionA: 'Rs. 1600',
    optionB: 'Rs. 1680',
    optionC: 'Rs. 1720',
    optionD: 'Rs. 1800',
    correctOption: 'B',
    explanation: 'Amount = 8000 * (1 + 0.10)^2 = 8000 * 1.21 = Rs. 9680. CI = 9680 - 8000 = Rs. 1680.',
    recompute: () => {
      const val = Math.round(8000 * (Math.pow(1.10, 2) - 1));
      return { expectedValue: `Rs. ${val}`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'A single unbiased six-sided die is rolled once. What is the probability that the face showing is a prime number?',
    optionA: '1/3',
    optionB: '1/2',
    optionC: '2/3',
    optionD: '5/6',
    correctOption: 'B',
    explanation: 'Total outcomes = 6. Prime numbers between 1 and 6 are {2, 3, 5} (3 outcomes). Probability = 3/6 = 1/2.',
    recompute: () => {
      const primes = [2, 3, 5].length;
      const total = 6;
      return { expectedValue: `${primes}/${total} = 1/2`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'Pipe A can fill a reservoir in 15 minutes while Pipe B can empty it in 30 minutes. If both pipes operate together, how many minutes will it take to fill the empty reservoir?',
    optionA: '20 minutes',
    optionB: '25 minutes',
    optionC: '30 minutes',
    optionD: '45 minutes',
    correctOption: 'C',
    explanation: 'Net fill rate per minute = 1/15 - 1/30 = 1/30. Time required to fill = 30 minutes.',
    recompute: () => {
      const val = Math.round(1 / (1 / 15 - 1 / 30));
      return { expectedValue: `${val} minutes`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'The ratio of the present ages of a father and his son is 7:2. Ten years from now, the sum of their ages will be 65 years. What is the present age of the father?',
    optionA: '28 years',
    optionB: '35 years',
    optionC: '42 years',
    optionD: '49 years',
    correctOption: 'B',
    explanation: 'Let ages be 7x and 2x. In 10 years: (7x + 10) + (2x + 10) = 65 => 9x + 20 = 65 => 9x = 45 => x = 5. Father age = 7 * 5 = 35 years.',
    recompute: () => {
      const x = (65 - 20) / (7 + 2);
      const val = 7 * x;
      return { expectedValue: `${val} years`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'Identify the next term in the geometric progression: 3, 9, 27, 81, ?',
    optionA: '162',
    optionB: '216',
    optionC: '243',
    optionD: '270',
    correctOption: 'C',
    explanation: 'Each term is multiplied by common ratio 3. Next term = 81 * 3 = 243.',
    recompute: () => {
      const val = 81 * 3;
      return { expectedValue: `${val}`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'A motorboat speeds at 14 km/h in still water. If the river stream flows at 2 km/h, how many hours will the boat take to travel 64 km downstream?',
    optionA: '3 hours',
    optionB: '4 hours',
    optionC: '5 hours',
    optionD: '6 hours',
    correctOption: 'B',
    explanation: 'Downstream speed = Boat speed + Stream speed = 14 + 2 = 16 km/h. Time = 64 / 16 = 4 hours.',
    recompute: () => {
      const val = 64 / (14 + 2);
      return { expectedValue: `${val} hours`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'medium',
    questionText: 'In how many distinct ways can all five letters of the word "SMART" be arranged without repetition?',
    optionA: '60',
    optionB: '100',
    optionC: '120',
    optionD: '720',
    correctOption: 'C',
    explanation: 'Number of distinct letters = 5. Total arrangements = 5! = 5 * 4 * 3 * 2 * 1 = 120.',
    recompute: () => {
      const val = 5 * 4 * 3 * 2 * 1;
      return { expectedValue: `${val}`, matchedOption: 'C' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'hard',
    questionText: 'In what ratio must a merchant blend premium tea costing Rs. 40 per kg with standard tea costing Rs. 30 per kg to obtain a blend worth Rs. 34 per kg?',
    optionA: '2:3',
    optionB: '3:2',
    optionC: '3:4',
    optionD: '4:3',
    correctOption: 'A',
    explanation: 'By alligation rule: (Cost of dearer - Mean) / (Mean - Cost of cheaper) = (40 - 34) / (34 - 30) = 6 / 4 = 3 / 2 (cheaper to dearer = 2:3). Hence ratio of standard to premium is 3:2, so premium to standard is 2:3.',
    recompute: () => {
      // standard (30) to premium (40) giving 34: (40-34)/(34-30) = 6/4 = 3:2, so premium:standard = 2:3
      return { expectedValue: '2:3', matchedOption: 'A' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'hard',
    questionText: 'A rectangular field has length 24 meters and a perimeter of 76 meters. What is the area of the rectangular field in square meters?',
    optionA: '312 sq m',
    optionB: '336 sq m',
    optionC: '360 sq m',
    optionD: '384 sq m',
    correctOption: 'B',
    explanation: 'Perimeter = 2 * (L + W) = 76 => 24 + W = 38 => W = 14 meters. Area = L * W = 24 * 14 = 336 sq m.',
    recompute: () => {
      const w = 76 / 2 - 24;
      const val = 24 * w;
      return { expectedValue: `${val} sq m`, matchedOption: 'B' };
    },
  },
  {
    topicName: 'Quantitative Aptitude',
    difficulty: 'hard',
    questionText: 'A laptop with a marked price of Rs. 1200 is sold after offering a promotional discount of 15%. What is the net selling price?',
    optionA: 'Rs. 980',
    optionB: 'Rs. 1000',
    optionC: 'Rs. 1020',
    optionD: 'Rs. 1050',
    correctOption: 'C',
    explanation: 'Discount = 15% of 1200 = Rs. 180. Selling price = 1200 - 180 = Rs. 1020.',
    recompute: () => {
      const val = 1200 * (1 - 0.15);
      return { expectedValue: `Rs. ${val}`, matchedOption: 'C' };
    },
  },

  // =========================================================================
  // LOGICAL REASONING (17 questions: 7 easy, 7 medium, 3 hard)
  // =========================================================================
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'Find the missing number in the sequence: 4, 8, 16, 32, ?',
    optionA: '48',
    optionB: '64',
    optionC: '72',
    optionD: '96',
    correctOption: 'B',
    explanation: 'Each subsequent number is obtained by doubling the previous number: 32 * 2 = 64.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'In a certain code, "DESK" is coded as "EFTL". How is "CHAIR" written in that same code?',
    optionA: 'DIBJS',
    optionB: 'EJCKS',
    optionC: 'DIALQ',
    optionD: 'DGZJQ',
    correctOption: 'A',
    explanation: 'Each letter is shifted forward by 1 position: C->D, H->I, A->B, I->J, R->S, yielding DIBJS.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'Pointing to a photograph of a boy, Suresh said, "He is the son of the only son of my mother." How is Suresh related to that boy?',
    optionA: 'Brother',
    optionB: 'Father',
    optionC: 'Uncle',
    optionD: 'Grandfather',
    correctOption: 'B',
    explanation: 'The only son of Suresh\'s mother is Suresh himself. Therefore, the boy is Suresh\'s son, making Suresh his father.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'Priya walks 10 meters North, then turns right and walks 5 meters. In which direction is she now facing?',
    optionA: 'North',
    optionB: 'East',
    optionC: 'South',
    optionD: 'West',
    correctOption: 'B',
    explanation: 'Starting facing North, turning 90 degrees right directs her toward the East.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'Choose the word which is odd one out among the options below:',
    optionA: 'Circle',
    optionB: 'Square',
    optionC: 'Triangle',
    optionD: 'Cube',
    correctOption: 'D',
    explanation: 'Circle, Square, and Triangle are two-dimensional planar figures, while Cube is a three-dimensional solid.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'If Monday was on the 1st day of a month, which day of the week will fall on the 17th day of the same month?',
    optionA: 'Tuesday',
    optionB: 'Wednesday',
    optionC: 'Thursday',
    optionD: 'Friday',
    correctOption: 'B',
    explanation: 'Days elapsed = 17 - 1 = 16 days. 16 mod 7 = 2 days forward from Monday. Monday + 2 days = Wednesday.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'easy',
    questionText: 'Complete the letter pattern: B, D, F, H, J, ?',
    optionA: 'K',
    optionB: 'L',
    optionC: 'M',
    optionD: 'N',
    correctOption: 'B',
    explanation: 'Alternating letters of the alphabet (+2 positions): J (10th) + 2 = L (12th letter).',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'Statements: (1) All mangoes are fruits. (2) All fruits are sweet. Conclusion I: All mangoes are sweet. Conclusion II: Some sweet things are mangoes.',
    optionA: 'Only Conclusion I follows',
    optionB: 'Only Conclusion II follows',
    optionC: 'Neither conclusion follows',
    optionD: 'Both Conclusion I and II follow',
    correctOption: 'D',
    explanation: 'Since mangoes are entirely contained in fruits and fruits in sweet items, all mangoes are sweet (I). By conversion of universal affirmative, some sweet items are mangoes (II).',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'Five colleagues (P, Q, R, S, T) sit in a row facing North. S is between T and Q. Q is to the immediate left of R. P is at the extreme left. Who occupies the exact middle seat?',
    optionA: 'P',
    optionB: 'S',
    optionC: 'T',
    optionD: 'Q',
    correctOption: 'B',
    explanation: 'P is at extreme left: [P, _, _, _, _]. S is between T and Q with Q immediately left of R yields arrangement: P, T, S, Q, R. Middle position is occupied by S at index 3.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'If "RED" is encoded as 27 and "BLUE" is encoded as 40, what is the code value for "GREEN" using the same standard alphabetical position sum?',
    optionA: '45',
    optionB: '49',
    optionC: '52',
    optionD: '56',
    correctOption: 'B',
    explanation: 'Letter values: G=7, R=18, E=5, E=5, N=14. Sum = 7 + 18 + 5 + 5 + 14 = 49.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'An analyst asserts: "Every smartphone manufactured by Company X contains 5G capability." Which statement, if true, conclusively disproves this claim?',
    optionA: 'Company X launches a new tablet without 5G.',
    optionB: 'A competing company sells 4G phones at lower cost.',
    optionC: 'A specific smartphone model released by Company X operates solely on 4G LTE.',
    optionD: 'Some consumers prefer 4G smartphones over 5G smartphones.',
    correctOption: 'C',
    explanation: 'A universal claim "all A are B" is strictly disproved by a single counterexample: finding an A that is not B.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'In a class of 45 students, Rohan ranks 18th from the top. What is his rank from the bottom of the class?',
    optionA: '27th',
    optionB: '28th',
    optionC: '29th',
    optionD: '30th',
    correctOption: 'B',
    explanation: 'Rank from bottom = Total students - Rank from top + 1 = 45 - 18 + 1 = 28th.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'If \'+\' denotes multiplication, \'-\' denotes division, \'*\' denotes addition, and \'/\' denotes subtraction, compute the value of: 12 + 3 * 6 / 4',
    optionA: '36',
    optionB: '38',
    optionC: '40',
    optionD: '42',
    correctOption: 'B',
    explanation: 'Replacing symbols: 12 * 3 + 6 - 4 = 36 + 6 - 4 = 38.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'medium',
    questionText: 'A clock shows 3:00. What is the acute angle formed between the hour hand and the minute hand?',
    optionA: '60 degrees',
    optionB: '75 degrees',
    optionC: '90 degrees',
    optionD: '120 degrees',
    correctOption: 'C',
    explanation: 'At 3:00, the minute hand points to 12 and the hour hand points to 3. Each hour division is 30 degrees, so 3 * 30 = 90 degrees.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'hard',
    questionText: 'Six executives (U, V, W, X, Y, Z) sit around a circular conference table facing the center. U is second to the left of X. Y sits directly opposite W. V is not adjacent to U. Who sits directly to the right of U?',
    optionA: 'W',
    optionB: 'X',
    optionC: 'Y',
    optionD: 'Z',
    correctOption: 'D',
    explanation: 'Placing X at 12 o\'clock, U sits at 8 o\'clock (second left). Y and W sit opposite each other at 10 and 4 o\'clock. Since V cannot be next to U, V must sit at 2 o\'clock, leaving Z at 6 o\'clock (immediately right of U).',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'hard',
    questionText: 'Statements: Some algorithms are efficient. No efficient system is vulnerable. All secure protocols are efficient systems. Which conclusion necessarily follows?',
    optionA: 'All algorithms are secure protocols.',
    optionB: 'No secure protocol is vulnerable.',
    optionC: 'All vulnerable systems are algorithms.',
    optionD: 'No algorithm is secure.',
    correctOption: 'B',
    explanation: 'Secure protocols are a subset of efficient systems, and no efficient system is vulnerable. Thus, no secure protocol can be vulnerable.',
  },
  {
    topicName: 'Logical Reasoning',
    difficulty: 'hard',
    questionText: 'A suspect states: "I only tell truths on Tuesdays, Thursdays, and Saturdays; on other days I always lie." On which day could the suspect validly make the statement: "Tomorrow I will lie"?',
    optionA: 'Tuesday',
    optionB: 'Wednesday',
    optionC: 'Saturday',
    optionD: 'Sunday',
    correctOption: 'C',
    explanation: 'On Saturday (a truth day), the suspect speaks truthfully: tomorrow is Sunday (a lie day), so tomorrow he will indeed lie.',
  },

  // =========================================================================
  // VERBAL ABILITY (17 questions: 7 easy, 7 medium, 3 hard)
  // =========================================================================
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Choose the word that is most nearly SYNONYMOUS with "DILIGENT":',
    optionA: 'Careless',
    optionB: 'Hardworking',
    optionC: 'Hesitant',
    optionD: 'Indifferent',
    correctOption: 'B',
    explanation: '"Diligent" means having or showing care and conscientiousness in one\'s work or duties; hardworking is an exact synonym.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Choose the word that is most nearly OPPOSITE (antonym) to "ABUNDANT":',
    optionA: 'Generous',
    optionB: 'Plentiful',
    optionC: 'Scarce',
    optionD: 'Vast',
    correctOption: 'C',
    explanation: '"Abundant" means existing in large quantities. "Scarce" means insufficient for the demand, serving as its direct antonym.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Identify the grammatically correct sentence among the choices:',
    optionA: 'Neither the manager nor the employees was present in the meeting.',
    optionB: 'Neither the manager nor the employees were present in the meeting.',
    optionC: 'Neither the manager nor the employees is present in the meeting.',
    optionD: 'Neither the manager or the employees was present in the meeting.',
    correctOption: 'B',
    explanation: 'When two subjects are joined by "neither... nor", the verb agrees in number with the subject closer to it ("employees" is plural -> "were").',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Fill in the blank with the appropriate preposition: "She has been working on this research project _______ six months."',
    optionA: 'since',
    optionB: 'for',
    optionC: 'from',
    optionD: 'during',
    correctOption: 'B',
    explanation: '"For" is used with a duration or period of time ("six months"), whereas "since" is used with a specific starting point in time.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Select the correctly spelled word:',
    optionA: 'Accomodate',
    optionB: 'Acommodate',
    optionC: 'Accommodate',
    optionD: 'Acomodate',
    correctOption: 'C',
    explanation: '"Accommodate" is spelled with double \'c\' and double \'m\'.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'What does the idiom "burn the midnight oil" mean?',
    optionA: 'Waste energy unnecessarily',
    optionB: 'Work late into the night',
    optionC: 'Cause an accidental fire',
    optionD: 'Wake up early in the morning',
    correctOption: 'B',
    explanation: '"Burn the midnight oil" refers to studying or working late into the night.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'easy',
    questionText: 'Choose the word that best completes the sentence: "The candidate\'s clear and articulate answers left a very _______ impression on the interviewers."',
    optionA: 'favorable',
    optionB: 'hostile',
    optionC: 'vague',
    optionD: 'pessimistic',
    correctOption: 'A',
    explanation: 'Clear and articulate answers yield a positive or "favorable" impression.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Identify the segment with an error: "Each of the participants (A) / were given a certificate (B) / after completing the test (C) / No error (D)"',
    optionA: 'Each of the participants',
    optionB: 'were given a certificate',
    optionC: 'after completing the test',
    optionD: 'No error',
    correctOption: 'B',
    explanation: '"Each" is a singular indefinite pronoun and requires a singular verb: "was given", not "were given".',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Choose the word that best captures: "A person who is able to use both hands with equal skill":',
    optionA: 'Ambivalent',
    optionB: 'Ambidextrous',
    optionC: 'Ambiguous',
    optionD: 'Amphibious',
    correctOption: 'B',
    explanation: '"Ambidextrous" describes an individual capable of using both the right and left hands with equal agility.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Choose the option that conveys the most logical passive voice form: "The engineering team developed an innovative routing algorithm."',
    optionA: 'An innovative routing algorithm was developed by the engineering team.',
    optionB: 'An innovative routing algorithm has been developed by the engineering team.',
    optionC: 'An innovative routing algorithm had developed by the engineering team.',
    optionD: 'An innovative routing algorithm is developed by the engineering team.',
    correctOption: 'A',
    explanation: 'Simple past tense active ("developed") converts to simple past passive ("was developed by").',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Fill in the blank: "Despite the complexity of the dataset, the researcher _______ a coherent conclusion."',
    optionA: 'elicited',
    optionB: 'deduced',
    optionC: 'inflicted',
    optionD: 'repealed',
    correctOption: 'B',
    explanation: '"Deduced" means arrived at by reasoning from available information, which fits drawing a conclusion from data.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Which option represents the most appropriate ANTONYM for "PRAGMATIC"?',
    optionA: 'Realistic',
    optionB: 'Sensible',
    optionC: 'Idealistic',
    optionD: 'Utilitarian',
    correctOption: 'C',
    explanation: '"Pragmatic" means guided by practical considerations, whereas "idealistic" means guided by noble ideals rather than practical realities.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'Select the sentence with correct punctuation and comma usage:',
    optionA: 'Although she studied hard she did not pass the exam.',
    optionB: 'Although she studied hard, she did not pass the exam.',
    optionC: 'Although, she studied hard she did not pass the exam.',
    optionD: 'Although she studied hard; she did not pass the exam.',
    correctOption: 'B',
    explanation: 'A dependent clause introducing a sentence ("Although she studied hard") must be followed by a comma before the independent clause.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'medium',
    questionText: 'What is the closest meaning of the idiom "take with a grain of salt"?',
    optionA: 'To consume food with seasoning',
    optionB: 'To view something with skepticism or reservation',
    optionC: 'To praise someone lavishly',
    optionD: 'To accept something without any doubt',
    correctOption: 'B',
    explanation: '"To take something with a grain of salt" means to remain skeptical and not accept a claim as wholly true without corroboration.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'hard',
    questionText: 'Read the sentence and choose the best replacement for the underlined phrase: "Had the engineers inspected the turbine earlier, the catastrophic failure _would be averted_."',
    optionA: 'would have been averted',
    optionB: 'will be averted',
    optionC: 'would avert',
    optionD: 'had been averted',
    correctOption: 'A',
    explanation: 'Third conditional (unreal past): "Had [subject] [past participle]..., [subject] would have been [past participle]".',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'hard',
    questionText: 'Choose the word that most accurately completes the sentence: "The speaker\'s argument was persuasive not because of raw rhetoric, but due to its sheer _______ and internal coherence."',
    optionA: 'cogency',
    optionB: 'frivolity',
    optionC: 'platitude',
    optionD: 'verbosity',
    correctOption: 'A',
    explanation: '"Cogency" denotes the quality of being clear, logical, and convincing.',
  },
  {
    topicName: 'Verbal Ability',
    difficulty: 'hard',
    questionText: 'Select the option that best expresses the author\'s tone: "While initial benchmark gains appear impressive, closer inspection reveals severe latency regression under realistic concurrent workloads."',
    optionA: 'Enthusiastic and celebratory',
    optionB: 'Critical and analytical',
    optionC: 'Apathetic and indifferent',
    optionD: 'Hostile and accusatory',
    correctOption: 'B',
    explanation: 'The author methodically balances observed gains against underlying regressions, exhibiting a critical and analytical perspective.',
  },
];
