export interface DemoTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface DemoProblem {
  slug: string;
  topicName: 'Arrays' | 'Strings';
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  tags: string[];
  testCases: DemoTestCase[];
}

export const demoCodingProblems: DemoProblem[] = [
  // =========================================================================
  // ARRAYS (5 problems)
  // =========================================================================
  {
    slug: 'array-sum',
    topicName: 'Arrays',
    difficulty: 'easy',
    title: 'Array Element Sum',
    description: 'Given an integer N followed by N space-separated integers, compute and print the sum of all elements in the array.\n\nInput Format:\nFirst line contains an integer N.\nSecond line contains N space-separated integers.\n\nConstraints:\n0 <= N <= 1000\n-10^6 <= nums[i] <= 10^6',
    sampleInput: '5\n1 2 3 4 5',
    sampleOutput: '15',
    tags: ['array', 'math', 'fundamentals'],
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '15', isHidden: false },
      { input: '0\n', expectedOutput: '0', isHidden: true },
      { input: '1\n-42', expectedOutput: '-42', isHidden: true },
      { input: '6\n-10 20 -30 40 -50 60', expectedOutput: '30', isHidden: true },
      { input: '10\n100 200 -50 0 1000 -200 450 -100 20 80', expectedOutput: '1500', isHidden: true },
    ],
  },
  {
    slug: 'find-maximum',
    topicName: 'Arrays',
    difficulty: 'easy',
    title: 'Find Maximum in Array',
    description: 'Given an integer N followed by N space-separated integers, find and print the maximum value in the array.\n\nInput Format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nConstraints:\n1 <= N <= 1000\n-10^6 <= nums[i] <= 10^6',
    sampleInput: '5\n3 7 2 9 5',
    sampleOutput: '9',
    tags: ['array', 'search'],
    testCases: [
      { input: '5\n3 7 2 9 5', expectedOutput: '9', isHidden: false },
      { input: '1\n-999', expectedOutput: '-999', isHidden: true },
      { input: '4\n-5 -5 -5 -5', expectedOutput: '-5', isHidden: true },
      { input: '5\n100 80 60 40 20', expectedOutput: '100', isHidden: true },
      { input: '7\n-10 0 45 -2 99 99 12', expectedOutput: '99', isHidden: true },
    ],
  },
  {
    slug: 'second-largest',
    topicName: 'Arrays',
    difficulty: 'medium',
    title: 'Second Largest Element',
    description: 'Given an integer N followed by N space-separated integers, find the second distinct largest element in the array. If no distinct second largest element exists, print -1.\n\nInput Format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nConstraints:\n1 <= N <= 1000\n-10^5 <= nums[i] <= 10^5',
    sampleInput: '5\n12 35 1 10 34',
    sampleOutput: '34',
    tags: ['array', 'search', 'sorting'],
    testCases: [
      { input: '5\n12 35 1 10 34', expectedOutput: '34', isHidden: false },
      { input: '4\n7 7 7 7', expectedOutput: '-1', isHidden: true },
      { input: '1\n10', expectedOutput: '-1', isHidden: true },
      { input: '5\n-10 -5 -20 -1 -8', expectedOutput: '-5', isHidden: true },
      { input: '3\n15 20 15', expectedOutput: '15', isHidden: true },
    ],
  },
  {
    slug: 'move-zeroes',
    topicName: 'Arrays',
    difficulty: 'medium',
    title: 'Move Zeroes to End',
    description: 'Given an integer N followed by N space-separated integers, move all 0s to the end of the array while maintaining the relative order of the non-zero elements. Print the resulting array elements space-separated.\n\nInput Format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nConstraints:\n1 <= N <= 1000\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '5\n0 1 0 3 12',
    sampleOutput: '1 3 12 0 0',
    tags: ['array', 'two-pointers'],
    testCases: [
      { input: '5\n0 1 0 3 12', expectedOutput: '1 3 12 0 0', isHidden: false },
      { input: '4\n8 3 7 2', expectedOutput: '8 3 7 2', isHidden: true },
      { input: '4\n0 0 0 0', expectedOutput: '0 0 0 0', isHidden: true },
      { input: '1\n0', expectedOutput: '0', isHidden: true },
      { input: '5\n5 4 3 0 0', expectedOutput: '5 4 3 0 0', isHidden: true },
    ],
  },
  {
    slug: 'contains-duplicate',
    topicName: 'Arrays',
    difficulty: 'easy',
    title: 'Check Array Duplicates',
    description: 'Given an integer N followed by N space-separated integers, determine whether any value appears at least twice in the array. Print "true" if any value appears at least twice, or "false" if every element is distinct.\n\nInput Format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nConstraints:\n1 <= N <= 1000\n-10^6 <= nums[i] <= 10^6',
    sampleInput: '4\n1 2 3 1',
    sampleOutput: 'true',
    tags: ['array', 'hash-table'],
    testCases: [
      { input: '4\n1 2 3 1', expectedOutput: 'true', isHidden: false },
      { input: '5\n10 20 30 40 50', expectedOutput: 'false', isHidden: true },
      { input: '1\n42', expectedOutput: 'false', isHidden: true },
      { input: '4\n-5 2 -5 8', expectedOutput: 'true', isHidden: true },
      { input: '6\n9 1 2 3 4 9', expectedOutput: 'true', isHidden: true },
    ],
  },

  // =========================================================================
  // STRINGS (5 problems)
  // =========================================================================
  {
    slug: 'reverse-string',
    topicName: 'Strings',
    difficulty: 'easy',
    title: 'Reverse a String',
    description: 'Given a single line containing a string S, print the string reversed.\n\nInput Format:\nA single line of text.\n\nConstraints:\n1 <= length(S) <= 1000',
    sampleInput: 'welcome',
    sampleOutput: 'emoclew',
    tags: ['string', 'two-pointers'],
    testCases: [
      { input: 'welcome', expectedOutput: 'emoclew', isHidden: false },
      { input: 'q', expectedOutput: 'q', isHidden: true },
      { input: 'deified', expectedOutput: 'deified', isHidden: true },
      { input: 'Code123!', expectedOutput: '!321edoC', isHidden: true },
      { input: 'Placement Prep 2025', expectedOutput: '5202 perP tnemecalP', isHidden: true },
    ],
  },
  {
    slug: 'is-palindrome',
    topicName: 'Strings',
    difficulty: 'easy',
    title: 'Valid Palindrome',
    description: 'Given a string S, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases. Print "true" if it is a palindrome, or "false" otherwise.\n\nInput Format:\nA single line containing string S.\n\nConstraints:\n1 <= length(S) <= 1000',
    sampleInput: 'A man a plan a canal Panama',
    sampleOutput: 'true',
    tags: ['string', 'two-pointers'],
    testCases: [
      { input: 'A man a plan a canal Panama', expectedOutput: 'true', isHidden: false },
      { input: 'race a car', expectedOutput: 'false', isHidden: true },
      { input: 'a', expectedOutput: 'true', isHidden: true },
      { input: '.,!', expectedOutput: 'true', isHidden: true },
      { input: '0P', expectedOutput: 'false', isHidden: true },
    ],
  },
  {
    slug: 'count-vowels',
    topicName: 'Strings',
    difficulty: 'medium',
    title: 'Count Vowels and Consonants',
    description: 'Given a string S, count the number of English vowels (A, E, I, O, U, case-insensitive) and consonants (alphabetic characters that are not vowels). Print the count in the exact format: "Vowels: X, Consonants: Y".\n\nInput Format:\nA single line of text.\n\nConstraints:\n1 <= length(S) <= 1000',
    sampleInput: 'Campus Placement',
    sampleOutput: 'Vowels: 5, Consonants: 10',
    tags: ['string', 'parsing'],
    testCases: [
      { input: 'Campus Placement', expectedOutput: 'Vowels: 5, Consonants: 10', isHidden: false },
      { input: 'AEIOU aeiou', expectedOutput: 'Vowels: 10, Consonants: 0', isHidden: true },
      { input: 'rhythm fly', expectedOutput: 'Vowels: 0, Consonants: 9', isHidden: true },
      { input: '12345 @#$%', expectedOutput: 'Vowels: 0, Consonants: 0', isHidden: true },
      { input: 'IntelliPlace 2025!', expectedOutput: 'Vowels: 5, Consonants: 7', isHidden: true },
    ],
  },
  {
    slug: 'check-anagram',
    topicName: 'Strings',
    difficulty: 'medium',
    title: 'Check Valid Anagram',
    description: 'Given two strings S1 and S2 on separate lines, determine whether S2 is an anagram of S1. Two strings are anagrams if they contain the exact same characters with identical frequencies, ignoring spaces. Comparison is case-sensitive. Print "true" if anagram, else "false".\n\nInput Format:\nFirst line contains S1.\nSecond line contains S2.\n\nConstraints:\n1 <= length(S1), length(S2) <= 1000',
    sampleInput: 'listen\nsilent',
    sampleOutput: 'true',
    tags: ['string', 'hash-table', 'sorting'],
    testCases: [
      { input: 'listen\nsilent', expectedOutput: 'true', isHidden: false },
      { input: 'rat\ncar', expectedOutput: 'false', isHidden: true },
      { input: 'aacc\ncaaa', expectedOutput: 'false', isHidden: true },
      { input: 'z\nz', expectedOutput: 'true', isHidden: true },
      { input: 'dormitory\ndirty room', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    slug: 'first-non-repeating',
    topicName: 'Strings',
    difficulty: 'hard',
    title: 'First Non-Repeating Character',
    description: 'Given a string S consisting of lowercase English letters, find and print the first non-repeating character in S. If every character in S repeats or S is empty, print "-1".\n\nInput Format:\nA single line of text containing S.\n\nConstraints:\n1 <= length(S) <= 1000\nS contains only lowercase English letters [a-z].',
    sampleInput: 'leetcode',
    sampleOutput: 'l',
    tags: ['string', 'hash-table', 'queue'],
    testCases: [
      { input: 'leetcode', expectedOutput: 'l', isHidden: false },
      { input: 'loveleetcode', expectedOutput: 'v', isHidden: true },
      { input: 'aabbcc', expectedOutput: '-1', isHidden: true },
      { input: 'z', expectedOutput: 'z', isHidden: true },
      { input: 'aabbccd', expectedOutput: 'd', isHidden: true },
    ],
  },
];
