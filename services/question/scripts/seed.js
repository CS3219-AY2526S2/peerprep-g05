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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "questions_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
});

const cliArgs = process.argv.slice(2);

function getCliArgValue(flag) {
    const idx = cliArgs.findIndex((arg) => arg === flag);
    if (idx >= 0 && idx + 1 < cliArgs.length) {
        return cliArgs[idx + 1];
    }
    return undefined;
}

function parsePositiveInt(value) {
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function splitIntoChunks(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

function normalizeTitleKey(value) {
    return String(value || "").trim().toLowerCase();
}

function buildPythonBoilerplateExamples(title) {
    const t = String(title || "").toLowerCase();

    if (t.includes("valid anagram")) {
        return [
            {
                inputText: 's = "anagram", t = "nagaram"',
                outputText: "true",
                explanation: "Both strings contain the same letters with identical frequencies.",
            },
            {
                inputText: 's = "rat", t = "car"',
                outputText: "false",
                explanation: "Character frequencies differ, so the strings are not anagrams.",
            },
            {
                inputText: 's = "listen", t = "silent"',
                outputText: "true",
                explanation: "Another positive case with reordered characters.",
            },
            {
                inputText: 's = "aacc", t = "ccac"',
                outputText: "false",
                explanation: "Private case where counts differ for one or more letters.",
            },
            {
                inputText: 's = "", t = ""',
                outputText: "true",
                explanation: "Private edge case: empty strings are trivially anagrams.",
            },
        ];
    }

    if (t.includes("unique paths ii")) {
        return [
            {
                inputText: "obstacleGrid = [[0,0,0],[0,1,0],[0,0,0]]",
                outputText: "2",
                explanation: "There are two valid paths that avoid the obstacle.",
            },
            {
                inputText: "obstacleGrid = [[0,1],[0,0]]",
                outputText: "1",
                explanation: "Only one route remains when the top-right cell is blocked.",
            },
            {
                inputText: "obstacleGrid = [[0,0],[0,1]]",
                outputText: "0",
                explanation: "Destination is blocked, so no path exists.",
            },
            {
                inputText: "obstacleGrid = [[1]]",
                outputText: "0",
                explanation: "Private edge case where the start cell is blocked.",
            },
            {
                inputText: "obstacleGrid = [[0]]",
                outputText: "1",
                explanation: "Private edge case with a 1x1 empty grid.",
            },
        ];
    }

    if (t.includes("unique paths")) {
        return [
            {
                inputText: "m = 3, n = 7",
                outputText: "28",
                explanation: "Classic combinatorics example.",
            },
            {
                inputText: "m = 3, n = 2",
                outputText: "3",
                explanation: "Three unique right/down paths exist.",
            },
            {
                inputText: "m = 7, n = 3",
                outputText: "28",
                explanation: "Symmetry with swapped dimensions.",
            },
            {
                inputText: "m = 1, n = 10",
                outputText: "1",
                explanation: "Private edge case with single row.",
            },
            {
                inputText: "m = 10, n = 1",
                outputText: "1",
                explanation: "Private edge case with single column.",
            },
        ];
    }

    return [
        {
            inputText: "values = [1, 2, 3]",
            outputText: "3",
            explanation: "A baseline public example for the core behavior.",
        },
        {
            inputText: "values = [0, 0, 0]",
            outputText: "0",
            explanation: "A second public example with a different input pattern.",
        },
        {
            inputText: "values = [5]",
            outputText: "1",
            explanation: "A compact public edge-style example.",
        },
        {
            inputText: "values = []",
            outputText: "0",
            explanation: "Private edge case: empty-like input contract.",
        },
        {
            inputText: "values = [1000000, -1000000]",
            outputText: "2",
            explanation: "Private stress-style case with large-magnitude values.",
        },
    ];
}

function inferProblemIntent(title, categories) {
    const t = String(title || "").toLowerCase();
    const has = (s) => t.includes(s);

    if (has("unique paths ii")) return "Given an m x n grid with obstacles, count unique paths from top-left to bottom-right when moves are only right or down.";
    if (has("unique paths")) return "Given an m x n grid, count unique paths from top-left to bottom-right when moves are only right or down.";
    if (has("trapping rain water")) return "Given an elevation map represented by bar heights, compute how much rain water is trapped after raining.";
    if (has("valid anagram")) return "Given two strings s and t, return true if t is an anagram of s, and false otherwise.";
    if (has("add binary")) return "Given two binary strings, return their sum as a binary string.";
    if (has("climbing stairs")) return "You can climb 1 or 2 steps at a time; return the number of distinct ways to reach step n.";
    if (has("jump game ii")) return "Given an array where each value is max jump length, return the minimum jumps needed to reach the last index.";
    if (has("jump game")) return "Given an array where each value is max jump length, determine whether the last index is reachable.";
    if (has("house robber ii")) return "Given house values arranged in a circle, return the maximum amount you can rob without robbing adjacent houses.";
    if (has("house robber")) return "Given house values in a line, return the maximum amount you can rob without robbing adjacent houses.";
    if (has("course schedule ii")) return "Given course prerequisites, return a valid order to complete all courses, or an empty list if impossible.";
    if (has("course schedule")) return "Given course prerequisites, determine whether all courses can be completed.";
    if (has("meeting rooms ii")) return "Given meeting intervals, return the minimum number of rooms required to host all meetings.";
    if (has("insert interval")) return "Given sorted non-overlapping intervals and a new interval, insert it and merge overlaps.";
    if (has("random pick with weight")) return "Given positive weights, design random picking so each index is chosen proportional to its weight.";
    if (has("time based key-value store")) return "Design a time-based key-value store supporting set(key, value, timestamp) and get(key, timestamp).";
    if (has("task scheduler")) return "Given tasks and cooldown n, return the minimum time intervals needed to execute all tasks.";
    if (has("find median from data stream")) return "Design a structure that supports adding numbers and returning the median at any time.";
    if (has("koko eating bananas")) return "Given banana piles and h hours, find the minimum integer speed so all bananas are eaten within h hours.";
    if (has("capacity to ship packages within d days")) return "Given package weights and D days, find the minimum ship capacity to deliver all packages in order within D days.";
    if (has("open the lock")) return "Starting from 0000, return the minimum turns to reach target while avoiding deadends, or -1 if impossible.";
    if (has("game of life")) return "Given the current board state of Conway's Game of Life, compute the next board state.";
    if (has("decode ways")) return "Given a digit string, return the number of ways it can be decoded with 1->A through 26->Z.";
    if (has("decode string")) return "Given an encoded string using k[pattern], return the decoded string.";
    if (has("daily temperatures")) return "For each day, return how many days until a warmer temperature, or 0 if none exists.";

    if (has("anagram")) return "Given two strings, determine whether they are anagrams of each other.";
    if (has("palindrome")) return "Determine whether the input satisfies palindrome constraints for this problem.";
    if (has("two sum") || has("3sum") || has("4sum")) return "Find values or indices that satisfy the required target-sum condition.";
    if (has("substring") || has("subarray")) return "Compute the required property over contiguous substrings/subarrays.";
    if (has("binary tree") || has("tree")) return "Traverse or analyze the tree structure to produce the required result.";
    if (has("linked list")) return "Manipulate linked-list nodes according to the required transformation.";
    if (has("matrix") || has("grid")) return "Process the 2D matrix/grid and return the required transformed or aggregated output.";
    if (has("stock")) return "Optimize buy/sell decisions under the problem's stock-trading constraints.";
    if (has("cache") || has("design")) return "Implement the required data structure behavior and operation semantics.";
    if (has("graph") || has("island") || has("course schedule")) return "Model the problem as a graph and compute the required traversal or feasibility result.";
    if (has("search") || has("binary search")) return "Use efficient search logic to locate or compute the requested value.";

    const topicHint = Array.isArray(categories) && categories.length > 0
        ? ` using ${categories.slice(0, 2).join(" and ")}`
        : "";
    return `Given the inputs for \"${title}\", return the required output according to the problem constraints${topicHint}.`;
}

function buildPythonBoilerplateDescription(title, categories, examples) {
    const [e1, e2, e3] = examples;
    const intent = inferProblemIntent(title, categories);
    return (
        `Practice problem: ${title}.\n\n` +
        `${intent}\n\n` +
        "Example 1:\n\n" +
        `Input: ${e1.inputText}\n` +
        `Output: ${e1.outputText}\n` +
        `Explanation: ${e1.explanation}\n\n` +
        "Example 2:\n\n" +
        `Input: ${e2.inputText}\n` +
        `Output: ${e2.outputText}\n` +
        `Explanation: ${e2.explanation}\n\n` +
        "Example 3:\n\n" +
        `Input: ${e3.inputText}\n` +
        `Output: ${e3.outputText}\n` +
        `Explanation: ${e3.explanation}`
    );
}

function buildPythonBoilerplateTestCases(title, categories = []) {
    const examples = buildPythonBoilerplateExamples(title);

    const testCases = examples.map((example, index) => {
        const isPublic = index < 3;
        return {
            input: example.inputText,
            expected_output: example.outputText,
            is_public: isPublic,
        };
    });

    return {
        description: buildPythonBoilerplateDescription(title, categories, examples),
        testCases,
    };
}

function ensurePublicPrivateCoverage(title, testCases) {
    const safeCases = Array.isArray(testCases) ? [...testCases] : [];
    const hasPublic = safeCases.some((tc) => tc.is_public !== false);
    const hasPrivate = safeCases.some((tc) => tc.is_public === false);

    if (hasPublic && hasPrivate) return safeCases;

    const boilerplate = buildPythonBoilerplateTestCases(title).testCases;
    if (!hasPublic) {
        const publicCase = boilerplate.find((tc) => tc.is_public !== false);
        if (publicCase) safeCases.push(publicCase);
    }
    if (!hasPrivate) {
        const privateCase = boilerplate.find((tc) => tc.is_public === false);
        if (privateCase) safeCases.push(privateCase);
    }

    return safeCases;
}

function loadLiquidslrQuestionBank() {
    const bankPath = path.join(__dirname, "data", "liquidslr-200-unique.json");
    if (!fs.existsSync(bankPath)) return [];

    try {
        const raw = fs.readFileSync(bankPath, "utf8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const seen = new Set();
        const baseQuestionByTitle = new Map(
            BASE_QUESTIONS.map((q) => [normalizeTitleKey(q.title), q])
        );
        const unique = [];

        for (const item of parsed) {
            const title = String(item?.title || "").trim();
            if (!title) continue;

            const key = normalizeTitleKey(title);
            if (seen.has(key)) continue;
            seen.add(key);

            const categories = Array.isArray(item?.categories) && item.categories.length > 0
                ? item.categories.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 4)
                : ["Algorithms"];

            const companies = Array.isArray(item?.companies)
                ? item.companies.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 8)
                : [];

            const legacy = baseQuestionByTitle.get(key);
            const boilerplate = buildPythonBoilerplateTestCases(title, categories);

            unique.push({
                title,
                description: legacy?.description || buildPythonBoilerplateDescription(title, categories, buildPythonBoilerplateExamples(title)),
                categories,
                complexity: ["Easy", "Medium", "Hard"].includes(item?.complexity) ? item.complexity : "Medium",
                companies,
                test_cases: legacy?.test_cases?.length
                    ? ensurePublicPrivateCoverage(title, legacy.test_cases.map((tc) => ({
                        input: tc.input,
                        expected_output: tc.expected_output,
                        is_public: tc.is_public,
                    })))
                    : boilerplate.testCases,
            });
        }

        return unique;
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Questions with test cases
// ---------------------------------------------------------------------------
const BASE_QUESTIONS = [
    {
        title: "Two Sum",
        description:
            "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\nExample 1:\n\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\nExample 2:\n\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n\nExample 3:\n\nInput: nums = [3,3], target = 6\nOutput: [0,1]",
        categories: ["Arrays", "Hash Table"],
        complexity: "Easy",
        companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
        test_cases: [
            { input: "nums = [2,7,11,15], target = 9", expected_output: "[0,1]", is_public: true },
            { input: "nums = [3,2,4], target = 6", expected_output: "[1,2]", is_public: true },
            { input: "nums = [3,3], target = 6", expected_output: "[0,1]", is_public: true },
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
            "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nVisual aid (original text sketch):\nHeights:  [0,1,0,2,1,0,1,3,2,1,2,1]\nWater:      _ _   _     _\nBars :    | | | | | | | | |\n(Imagine each index as a vertical bar; water fills low valleys between taller boundaries.)\n\nExample 1:\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\nExplanation: The elevation map is represented by the array. In this case, 6 units of rain water are trapped.\n\nExample 2:\nInput: height = [4,2,0,3,2,5]\nOutput: 9",
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
const DEFAULT_QUESTION_COUNT = 200;
const LOAD_TEST_QUESTION_COUNT = 10000;
const cliLoadTest = cliArgs.includes("--load-test");
const envLoadTest = String(process.env.SEED_LOAD_TEST || "").toLowerCase() === "true";
const explicitTargetCount =
    parsePositiveInt(getCliArgValue("--count")) ||
    parsePositiveInt(process.env.SEED_TARGET_QUESTION_COUNT);

const TARGET_QUESTION_COUNT =
    explicitTargetCount ||
    (cliLoadTest || envLoadTest ? LOAD_TEST_QUESTION_COUNT : DEFAULT_QUESTION_COUNT);

const LIQUIDSLR_QUESTIONS = loadLiquidslrQuestionBank();

function buildSeedQuestions(targetCount) {
    const sourceQuestions = LIQUIDSLR_QUESTIONS.length > 0 ? LIQUIDSLR_QUESTIONS : BASE_QUESTIONS;

    if (sourceQuestions.length >= targetCount) {
        return sourceQuestions.slice(0, targetCount);
    }

    const expanded = [...sourceQuestions];
    let variant = 1;

    while (expanded.length < targetCount) {
        const base = sourceQuestions[(expanded.length - sourceQuestions.length) % sourceQuestions.length];
        expanded.push({
            ...base,
            title: `${base.title} (Practice Variant ${variant})`,
            description:
                `${base.description}\n\nThis is an additional practice variant used to increase question coverage for matching and practice.`,
            test_cases: (base.test_cases || []).map((tc) => ({ ...tc })),
        });
        variant += 1;
    }

    return expanded;
}

async function seed() {
    const client = await pool.connect();
    const QUESTIONS = buildSeedQuestions(TARGET_QUESTION_COUNT);
    try {
        await client.query("BEGIN");

        // Ensure SERIAL sequences are aligned with table data before inserts.
        await client.query(`
            SELECT setval(
                pg_get_serial_sequence('questions', 'id'),
                COALESCE(MAX(id), 1),
                MAX(id) IS NOT NULL
            )
            FROM questions;

            SELECT setval(
                pg_get_serial_sequence('test_cases', 'id'),
                COALESCE(MAX(id), 1),
                MAX(id) IS NOT NULL
            )
            FROM test_cases;
        `);

        const allTitleKeys = QUESTIONS.map((q) => q.title.toLowerCase());
        const existingResult = await client.query(
            "SELECT LOWER(title) AS key FROM questions WHERE LOWER(title) = ANY($1::text[])",
            [allTitleKeys]
        );

        const existingKeys = new Set(existingResult.rows.map((row) => row.key));
        const questionsToInsert = QUESTIONS.filter((q) => !existingKeys.has(q.title.toLowerCase()));

        const insertedIdByTitle = new Map();
        const questionChunks = splitIntoChunks(questionsToInsert, 500);
        let insertedCount = 0;

        for (const [index, chunk] of questionChunks.entries()) {
            const values = [];
            const placeholders = chunk.map((q, i) => {
                const offset = i * 5;
                values.push(q.title, q.description, q.categories, q.complexity, q.companies || []);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
            });

            const inserted = await client.query(
                `INSERT INTO questions (title, description, categories, complexity, companies)
                 VALUES ${placeholders.join(", ")}
                 ON CONFLICT DO NOTHING
                 RETURNING id, title`,
                values
            );

            for (const row of inserted.rows) {
                insertedIdByTitle.set(row.title, row.id);
            }

            insertedCount += inserted.rows.length;
            console.log(`  Questions batch ${index + 1}/${questionChunks.length}: +${inserted.rows.length}`);
        }

        const testCaseRows = [];
        for (const q of questionsToInsert) {
            const questionId = insertedIdByTitle.get(q.title);
            if (!questionId || !q.test_cases?.length) continue;

            q.test_cases.forEach((tc, orderIndex) => {
                testCaseRows.push([
                    questionId,
                    tc.input,
                    tc.expected_output,
                    tc.is_public,
                    orderIndex,
                ]);
            });
        }

        let insertedTestCaseCount = 0;
        const testCaseChunks = splitIntoChunks(testCaseRows, 2000);
        for (const [index, chunk] of testCaseChunks.entries()) {
            if (chunk.length === 0) continue;

            const values = [];
            const placeholders = chunk.map((row, i) => {
                const offset = i * 5;
                values.push(...row);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
            });

            await client.query(
                `INSERT INTO test_cases (question_id, input, expected_output, is_public, order_index)
                 VALUES ${placeholders.join(", ")}`,
                values
            );

            insertedTestCaseCount += chunk.length;
            console.log(`  Test-case batch ${index + 1}/${testCaseChunks.length}: +${chunk.length}`);
        }

        const skippedCount = QUESTIONS.length - insertedCount;

        await client.query("COMMIT");
        console.log(`\nSeed target: ${QUESTIONS.length} questions`);
        console.log(`Inserted: ${insertedCount}`);
        console.log(`Skipped (already existed): ${skippedCount}`);
        console.log(`Inserted test cases: ${insertedTestCaseCount}`);
        if (cliLoadTest || envLoadTest || TARGET_QUESTION_COUNT >= LOAD_TEST_QUESTION_COUNT) {
            console.log("Load-test seeding mode was used");
        }
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
