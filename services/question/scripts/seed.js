/**
 * Seed script — populates the questions DB with sample problems + test cases.
 *
 * Company tags sourced from:
 *   https://github.com/liquidslr/interview-company-wise-problems
 *   Credit: @liquidslr
 *
 * Usage:
 *   node scripts/seed.js            (uses env vars / .env)
 *   POSTGRES_HOST=question-db node scripts/seed.js   (inside Docker)
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "questions_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
});

// ---------------------------------------------------------------------------
// Questions with test cases
// ---------------------------------------------------------------------------
const QUESTIONS = [
    {
        title: "Two Sum",
        description:
            "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n**Example 1:**\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\n**Example 2:**\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]",
        categories: ["Arrays", "Hash Table"],
        complexity: "Easy",
        companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
        test_cases: [
            { input: "nums = [2,7,11,15], target = 9", expected_output: "[0,1]", is_public: true },
            { input: "nums = [3,2,4], target = 6", expected_output: "[1,2]", is_public: true },
            { input: "nums = [3,3], target = 6", expected_output: "[0,1]", is_public: false },
            { input: "nums = [1,5,3,7], target = 8", expected_output: "[1,2]", is_public: false },
        ],
    },
    {
        title: "Reverse Linked List",
        description:
            "Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\n**Example 1:**\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\n**Example 2:**\nInput: head = [1,2]\nOutput: [2,1]\n\n**Example 3:**\nInput: head = []\nOutput: []",
        categories: ["Linked List", "Recursion"],
        complexity: "Easy",
        companies: ["Amazon", "Microsoft", "Apple", "Bloomberg"],
        test_cases: [
            { input: "head = [1,2,3,4,5]", expected_output: "[5,4,3,2,1]", is_public: true },
            { input: "head = [1,2]", expected_output: "[2,1]", is_public: true },
            { input: "head = []", expected_output: "[]", is_public: true },
            { input: "head = [1]", expected_output: "[1]", is_public: false },
        ],
    },
    {
        title: "Valid Parentheses",
        description:
            "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n**Example 1:**\nInput: s = \"()\"\nOutput: true\n\n**Example 2:**\nInput: s = \"()[]{}\"\nOutput: true\n\n**Example 3:**\nInput: s = \"(]\"\nOutput: false",
        categories: ["Strings", "Stack"],
        complexity: "Easy",
        companies: ["Google", "Amazon", "Meta", "Bloomberg", "Microsoft"],
        test_cases: [
            { input: 's = "()"', expected_output: "true", is_public: true },
            { input: 's = "()[]{}"', expected_output: "true", is_public: true },
            { input: 's = "(]"', expected_output: "false", is_public: true },
            { input: 's = "([)]"', expected_output: "false", is_public: false },
            { input: 's = "{[]}"', expected_output: "true", is_public: false },
        ],
    },
    {
        title: "Best Time to Buy and Sell Stock",
        description:
            "You are given an array `prices` where `prices[i]` is the price of a given stock on the i-th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.\n\n**Example 1:**\nInput: prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.\n\n**Example 2:**\nInput: prices = [7,6,4,3,1]\nOutput: 0",
        categories: ["Arrays", "Dynamic Programming"],
        complexity: "Easy",
        companies: ["Amazon", "Google", "Meta", "Goldman Sachs", "Morgan Stanley"],
        test_cases: [
            { input: "prices = [7,1,5,3,6,4]", expected_output: "5", is_public: true },
            { input: "prices = [7,6,4,3,1]", expected_output: "0", is_public: true },
            { input: "prices = [1,2]", expected_output: "1", is_public: false },
            { input: "prices = [2,1,2,1,0,1,2]", expected_output: "2", is_public: false },
        ],
    },
    {
        title: "Merge Two Sorted Lists",
        description:
            "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n**Example 1:**\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n\n**Example 2:**\nInput: list1 = [], list2 = []\nOutput: []\n\n**Example 3:**\nInput: list1 = [], list2 = [0]\nOutput: [0]",
        categories: ["Linked List", "Recursion"],
        complexity: "Easy",
        companies: ["Amazon", "Microsoft", "Apple", "Adobe"],
        test_cases: [
            { input: "list1 = [1,2,4], list2 = [1,3,4]", expected_output: "[1,1,2,3,4,4]", is_public: true },
            { input: "list1 = [], list2 = []", expected_output: "[]", is_public: true },
            { input: "list1 = [], list2 = [0]", expected_output: "[0]", is_public: true },
            { input: "list1 = [5], list2 = [1,2,4]", expected_output: "[1,2,4,5]", is_public: false },
        ],
    },
    {
        title: "Add Two Numbers",
        description:
            "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.\n\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.\n\n**Example 1:**\nInput: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]\nExplanation: 342 + 465 = 807.\n\n**Example 2:**\nInput: l1 = [0], l2 = [0]\nOutput: [0]\n\n**Example 3:**\nInput: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]\nOutput: [8,9,9,9,0,0,0,1]",
        categories: ["Linked List", "Math"],
        complexity: "Medium",
        companies: ["Amazon", "Google", "Microsoft", "Bloomberg", "Adobe"],
        test_cases: [
            { input: "l1 = [2,4,3], l2 = [5,6,4]", expected_output: "[7,0,8]", is_public: true },
            { input: "l1 = [0], l2 = [0]", expected_output: "[0]", is_public: true },
            { input: "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]", expected_output: "[8,9,9,9,0,0,0,1]", is_public: true },
            { input: "l1 = [1,8], l2 = [0]", expected_output: "[1,8]", is_public: false },
        ],
    },
    {
        title: "Longest Substring Without Repeating Characters",
        description:
            "Given a string `s`, find the length of the longest substring without repeating characters.\n\n**Example 1:**\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.\n\n**Example 2:**\nInput: s = \"bbbbb\"\nOutput: 1\n\n**Example 3:**\nInput: s = \"pwwkew\"\nOutput: 3\nExplanation: The answer is \"wke\", with the length of 3.",
        categories: ["Strings", "Hash Table", "Sliding Window"],
        complexity: "Medium",
        companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
        test_cases: [
            { input: 's = "abcabcbb"', expected_output: "3", is_public: true },
            { input: 's = "bbbbb"', expected_output: "1", is_public: true },
            { input: 's = "pwwkew"', expected_output: "3", is_public: true },
            { input: 's = ""', expected_output: "0", is_public: false },
            { input: 's = "dvdf"', expected_output: "3", is_public: false },
        ],
    },
    {
        title: "3Sum",
        description:
            "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.\n\n**Example 1:**\nInput: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]\n\n**Example 2:**\nInput: nums = [0,1,1]\nOutput: []\n\n**Example 3:**\nInput: nums = [0,0,0]\nOutput: [[0,0,0]]",
        categories: ["Arrays", "Two Pointers", "Sorting"],
        complexity: "Medium",
        companies: ["Amazon", "Meta", "Microsoft", "Apple", "Bloomberg"],
        test_cases: [
            { input: "nums = [-1,0,1,2,-1,-4]", expected_output: "[[-1,-1,2],[-1,0,1]]", is_public: true },
            { input: "nums = [0,1,1]", expected_output: "[]", is_public: true },
            { input: "nums = [0,0,0]", expected_output: "[[0,0,0]]", is_public: true },
            { input: "nums = [-2,0,1,1,2]", expected_output: "[[-2,0,2],[-2,1,1]]", is_public: false },
        ],
    },
    {
        title: "Binary Tree Level Order Traversal",
        description:
            "Given the `root` of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).\n\n**Example 1:**\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]\n\n**Example 2:**\nInput: root = [1]\nOutput: [[1]]\n\n**Example 3:**\nInput: root = []\nOutput: []",
        categories: ["Trees", "Breadth-First Search"],
        complexity: "Medium",
        companies: ["Amazon", "Microsoft", "Meta", "LinkedIn"],
        test_cases: [
            { input: "root = [3,9,20,null,null,15,7]", expected_output: "[[3],[9,20],[15,7]]", is_public: true },
            { input: "root = [1]", expected_output: "[[1]]", is_public: true },
            { input: "root = []", expected_output: "[]", is_public: true },
            { input: "root = [1,2,3,4,5]", expected_output: "[[1],[2,3],[4,5]]", is_public: false },
        ],
    },
    {
        title: "Merge Intervals",
        description:
            "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\n**Example 1:**\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\nExplanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].\n\n**Example 2:**\nInput: intervals = [[1,4],[4,5]]\nOutput: [[1,5]]\nExplanation: Intervals [1,4] and [4,5] are considered overlapping.",
        categories: ["Arrays", "Sorting"],
        complexity: "Medium",
        companies: ["Google", "Meta", "Amazon", "Microsoft", "Bloomberg"],
        test_cases: [
            { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", expected_output: "[[1,6],[8,10],[15,18]]", is_public: true },
            { input: "intervals = [[1,4],[4,5]]", expected_output: "[[1,5]]", is_public: true },
            { input: "intervals = [[1,4],[0,4]]", expected_output: "[[0,4]]", is_public: false },
            { input: "intervals = [[1,4],[2,3]]", expected_output: "[[1,4]]", is_public: false },
        ],
    },
    {
        title: "Longest Palindromic Substring",
        description:
            "Given a string `s`, return the longest palindromic substring in `s`.\n\n**Example 1:**\nInput: s = \"babad\"\nOutput: \"bab\"\nExplanation: \"aba\" is also a valid answer.\n\n**Example 2:**\nInput: s = \"cbbd\"\nOutput: \"bb\"",
        categories: ["Strings", "Dynamic Programming"],
        complexity: "Medium",
        companies: ["Amazon", "Microsoft", "Google", "Cisco"],
        test_cases: [
            { input: 's = "babad"', expected_output: '"bab"', is_public: true },
            { input: 's = "cbbd"', expected_output: '"bb"', is_public: true },
            { input: 's = "a"', expected_output: '"a"', is_public: false },
            { input: 's = "ac"', expected_output: '"a"', is_public: false },
        ],
    },
    {
        title: "Container With Most Water",
        description:
            "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the i-th line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.\n\n**Example 1:**\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\n\n**Example 2:**\nInput: height = [1,1]\nOutput: 1",
        categories: ["Arrays", "Two Pointers", "Greedy"],
        complexity: "Medium",
        companies: ["Goldman Sachs", "Google", "Amazon", "Meta"],
        test_cases: [
            { input: "height = [1,8,6,2,5,4,8,3,7]", expected_output: "49", is_public: true },
            { input: "height = [1,1]", expected_output: "1", is_public: true },
            { input: "height = [4,3,2,1,4]", expected_output: "16", is_public: false },
            { input: "height = [1,2,1]", expected_output: "2", is_public: false },
        ],
    },
    {
        title: "Coin Change",
        description:
            "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.\n\n**Example 1:**\nInput: coins = [1,2,5], amount = 11\nOutput: 3\nExplanation: 11 = 5 + 5 + 1\n\n**Example 2:**\nInput: coins = [2], amount = 3\nOutput: -1\n\n**Example 3:**\nInput: coins = [1], amount = 0\nOutput: 0",
        categories: ["Dynamic Programming", "Breadth-First Search"],
        complexity: "Medium",
        companies: ["Amazon", "Google", "Apple", "Microsoft"],
        test_cases: [
            { input: "coins = [1,2,5], amount = 11", expected_output: "3", is_public: true },
            { input: "coins = [2], amount = 3", expected_output: "-1", is_public: true },
            { input: "coins = [1], amount = 0", expected_output: "0", is_public: true },
            { input: "coins = [1,5,10,25], amount = 30", expected_output: "2", is_public: false },
        ],
    },
    {
        title: "Number of Islands",
        description:
            "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\n**Example 1:**\nInput: grid = [\n  [\"1\",\"1\",\"1\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"0\",\"0\",\"0\",\"0\",\"0\"]\n]\nOutput: 1\n\n**Example 2:**\nInput: grid = [\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"0\",\"0\",\"1\",\"0\",\"0\"],\n  [\"0\",\"0\",\"0\",\"1\",\"1\"]\n]\nOutput: 3",
        categories: ["Graphs", "Depth-First Search", "Breadth-First Search", "Matrix"],
        complexity: "Medium",
        companies: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
        test_cases: [
            { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expected_output: "1", is_public: true },
            { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expected_output: "3", is_public: true },
            { input: 'grid = [["1","0","1"],["0","1","0"],["1","0","1"]]', expected_output: "5", is_public: false },
        ],
    },
    {
        title: "Trapping Rain Water",
        description:
            "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\n**Example 1:**\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\nExplanation: The elevation map is represented by the array. In this case, 6 units of rain water are being trapped.\n\n**Example 2:**\nInput: height = [4,2,0,3,2,5]\nOutput: 9",
        categories: ["Arrays", "Two Pointers", "Stack", "Dynamic Programming"],
        complexity: "Hard",
        companies: ["Google", "Amazon", "Goldman Sachs", "Microsoft", "Meta"],
        test_cases: [
            { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", expected_output: "6", is_public: true },
            { input: "height = [4,2,0,3,2,5]", expected_output: "9", is_public: true },
            { input: "height = [4,2,3]", expected_output: "1", is_public: false },
            { input: "height = [5,4,1,2]", expected_output: "1", is_public: false },
        ],
    },
    {
        title: "Merge k Sorted Lists",
        description:
            "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.\n\n**Example 1:**\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\n\n**Example 2:**\nInput: lists = []\nOutput: []\n\n**Example 3:**\nInput: lists = [[]]\nOutput: []",
        categories: ["Linked List", "Divide and Conquer", "Heap"],
        complexity: "Hard",
        companies: ["Amazon", "Meta", "Google", "Microsoft", "Uber"],
        test_cases: [
            { input: "lists = [[1,4,5],[1,3,4],[2,6]]", expected_output: "[1,1,2,3,4,4,5,6]", is_public: true },
            { input: "lists = []", expected_output: "[]", is_public: true },
            { input: "lists = [[]]", expected_output: "[]", is_public: true },
            { input: "lists = [[1],[2],[3]]", expected_output: "[1,2,3]", is_public: false },
        ],
    },
    {
        title: "Word Ladder",
        description:
            "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that:\n\n- Every adjacent pair of words differs by a single letter.\n- Every `si` for `1 <= i <= k` is in `wordList`. Note that `beginWord` does not need to be in `wordList`.\n- `sk == endWord`\n\nGiven two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or 0 if no such sequence exists.\n\n**Example 1:**\nInput: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]\nOutput: 5\nExplanation: One shortest transformation sequence is \"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> \"cog\", which is 5 words long.\n\n**Example 2:**\nInput: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]\nOutput: 0",
        categories: ["Strings", "Breadth-First Search", "Hash Table"],
        complexity: "Hard",
        companies: ["Amazon", "Meta", "Google", "LinkedIn", "Snapchat"],
        test_cases: [
            { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]', expected_output: "5", is_public: true },
            { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]', expected_output: "0", is_public: true },
            { input: 'beginWord = "a", endWord = "c", wordList = ["a","b","c"]', expected_output: "2", is_public: false },
        ],
    },
    {
        title: "Median of Two Sorted Arrays",
        description:
            "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).\n\n**Example 1:**\nInput: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000\nExplanation: merged array = [1,2,3] and median is 2.\n\n**Example 2:**\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.50000\nExplanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
        categories: ["Arrays", "Binary Search", "Divide and Conquer"],
        complexity: "Hard",
        companies: ["Google", "Amazon", "Goldman Sachs", "Apple", "Adobe"],
        test_cases: [
            { input: "nums1 = [1,3], nums2 = [2]", expected_output: "2.00000", is_public: true },
            { input: "nums1 = [1,2], nums2 = [3,4]", expected_output: "2.50000", is_public: true },
            { input: "nums1 = [0,0], nums2 = [0,0]", expected_output: "0.00000", is_public: false },
            { input: "nums1 = [], nums2 = [1]", expected_output: "1.00000", is_public: false },
        ],
    },
    {
        title: "Serialize and Deserialize Binary Tree",
        description:
            "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.\n\n**Example 1:**\nInput: root = [1,2,3,null,null,4,5]\nOutput: [1,2,3,null,null,4,5]\n\n**Example 2:**\nInput: root = []\nOutput: []",
        categories: ["Trees", "Design", "Depth-First Search", "Breadth-First Search"],
        complexity: "Hard",
        companies: ["Meta", "Amazon", "Google", "Microsoft", "LinkedIn"],
        test_cases: [
            { input: "root = [1,2,3,null,null,4,5]", expected_output: "[1,2,3,null,null,4,5]", is_public: true },
            { input: "root = []", expected_output: "[]", is_public: true },
            { input: "root = [1]", expected_output: "[1]", is_public: false },
            { input: "root = [1,2]", expected_output: "[1,2]", is_public: false },
        ],
    },
    {
        title: "Maximum Subarray",
        description:
            "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n**Example 1:**\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n\n**Example 2:**\nInput: nums = [1]\nOutput: 1\n\n**Example 3:**\nInput: nums = [5,4,-1,7,8]\nOutput: 23",
        categories: ["Arrays", "Dynamic Programming", "Divide and Conquer"],
        complexity: "Medium",
        companies: ["Amazon", "Google", "Apple", "LinkedIn", "Microsoft"],
        test_cases: [
            { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", expected_output: "6", is_public: true },
            { input: "nums = [1]", expected_output: "1", is_public: true },
            { input: "nums = [5,4,-1,7,8]", expected_output: "23", is_public: true },
            { input: "nums = [-1]", expected_output: "-1", is_public: false },
        ],
    },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------
async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const q of QUESTIONS) {
            // Skip if already exists
            const existing = await client.query(
                "SELECT id FROM questions WHERE LOWER(title) = LOWER($1)",
                [q.title]
            );
            if (existing.rows.length > 0) {
                console.log(`  ⏭  "${q.title}" already exists (id: ${existing.rows[0].id})`);
                continue;
            }

            // Insert question
            const result = await client.query(
                `INSERT INTO questions (title, description, categories, complexity, companies)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [q.title, q.description, q.categories, q.complexity, q.companies || []]
            );
            const questionId = result.rows[0].id;

            // Insert test cases
            if (q.test_cases && q.test_cases.length > 0) {
                const values = [];
                const placeholders = q.test_cases.map((tc, i) => {
                    const offset = i * 4;
                    values.push(questionId, tc.input, tc.expected_output, tc.is_public);
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ${i})`;
                });
                await client.query(
                    `INSERT INTO test_cases (question_id, input, expected_output, is_public, order_index)
                     VALUES ${placeholders.join(", ")}`,
                    values
                );
            }

            console.log(`  ✅  "${q.title}" [${q.complexity}] — ${q.test_cases?.length || 0} test cases`);
        }

        await client.query("COMMIT");
        console.log(`\nSeeded ${QUESTIONS.length} questions successfully.`);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
