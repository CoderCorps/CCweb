# Fallback Python Question Bank in case Anthropic API fails or is unconfigured.

FALLBACK_BASIC_QUESTIONS = [
    {
        "question": "What will be the output of `print(type([]))` in Python 3?",
        "options": [
            "<class 'list'>",
            "<class 'array'>",
            "<class 'tuple'>",
            "<class 'set'>"
        ],
        "correct_option_index": 0,
        "explanation": "In Python, square brackets `[]` define a list literal, so `type([])` returns `<class 'list'>`."
    },
    {
        "question": "Which of the following boolean expressions evaluates to `True` in Python?",
        "options": [
            "bool('')",
            "bool([0])",
            "bool(None)",
            "bool(0)"
        ],
        "correct_option_index": 1,
        "explanation": "A non-empty list like `[0]` evaluates to `True` in boolean context, whereas empty strings, `None`, and `0` evaluate to `False`."
    },
    {
        "question": "What is the result of `10 // 3` in Python?",
        "options": [
            "3.333",
            "3",
            "3.0",
            "1"
        ],
        "correct_option_index": 1,
        "explanation": "The `//` operator performs integer (floor) division in Python, truncating the decimal part to return integer `3`."
    },
    {
        "question": "How do you append an element `x` to an existing list `my_list`?",
        "options": [
            "my_list.add(x)",
            "my_list.push(x)",
            "my_list.append(x)",
            "my_list.insert(x)"
        ],
        "correct_option_index": 2,
        "explanation": "`append(x)` adds element `x` to the end of a list in Python."
    },
    {
        "question": "What will `len({'a': 1, 'b': 2, 'a': 3})` return?",
        "options": [
            "3",
            "2",
            "1",
            "Error"
        ],
        "correct_option_index": 1,
        "explanation": "Dictionary keys must be unique. Overwriting key `'a'` with `3` leaves 2 key-value pairs: `'a'` and `'b'`."
    },
    {
        "question": "Which keyword is used to start a loop that executes as long as a condition is true?",
        "options": [
            "for",
            "while",
            "loop",
            "repeat"
        ],
        "correct_option_index": 1,
        "explanation": "`while` is the condition-controlled loop keyword in Python."
    },
    {
        "question": "What is the output of `'hello'[1:4]`?",
        "options": [
            "'hel'",
            "'ell'",
            "'ello'",
            "'he'"
        ],
        "correct_option_index": 1,
        "explanation": "Slicing `[1:4]` extracts characters starting at index 1 up to (excluding) index 4, which yields `'ell'`."
    },
    {
        "question": "Which standard function converts a string to an integer?",
        "options": [
            "str()",
            "int()",
            "float()",
            "to_int()"
        ],
        "correct_option_index": 1,
        "explanation": "`int()` converts valid string representations of numbers to Python integer objects."
    },
    {
        "question": "What does `my_tuple[0] = 5` do if `my_tuple = (1, 2, 3)`?",
        "options": [
            "Changes the first element to 5",
            "Appends 5 to the tuple",
            "Raises a TypeError",
            "Creates a new tuple"
        ],
        "correct_option_index": 2,
        "explanation": "Tuples are immutable data structures in Python; modifying an element in place raises a `TypeError`."
    },
    {
        "question": "What is the value of `5 % 2`?",
        "options": [
            "2",
            "2.5",
            "1",
            "0"
        ],
        "correct_option_index": 2,
        "explanation": "The `%` modulo operator calculates the remainder after integer division. 5 divided by 2 is 2 with a remainder of 1."
    }
]

FALLBACK_INTERMEDIATE_QUESTIONS = [
    {
        "question": "What is the output of `[x**2 for x in range(5) if x % 2 == 0]`?",
        "options": [
            "[0, 1, 4, 9, 16]",
            "[0, 4, 16]",
            "[1, 9]",
            "[0, 2, 4]"
        ],
        "correct_option_index": 1,
        "explanation": "The list comprehension filters for even numbers (0, 2, 4) in range(5) and squares them to produce `[0, 4, 16]`."
    },
    {
        "question": "Consider `def add_item(item, lst=[]): lst.append(item); return lst`. What does `add_item(1)` followed by `add_item(2)` return?",
        "options": [
            "[1] then [2]",
            "[1] then [1, 2]",
            "[1, 2] then [1, 2]",
            "TypeError"
        ],
        "correct_option_index": 1,
        "explanation": "Default argument values in Python are evaluated once when the function is defined. The mutable list `lst` persists across calls."
    },
    {
        "question": "Which of the following correctly catches both `ValueError` and `ZeroDivisionError` in a single block?",
        "options": [
            "except ValueError, ZeroDivisionError:",
            "except (ValueError, ZeroDivisionError):",
            "except [ValueError | ZeroDivisionError]:",
            "except ValueError or ZeroDivisionError:"
        ],
        "correct_option_index": 1,
        "explanation": "Catching multiple exception types requires wrapping them in a tuple, e.g. `except (ValueError, ZeroDivisionError):`."
    },
    {
        "question": "What is the result of `list(map(lambda x: x * 2, [1, 2, 3]))`?",
        "options": [
            "[1, 2, 3, 1, 2, 3]",
            "[2, 4, 6]",
            "[1, 4, 9]",
            "[2, 2, 2]"
        ],
        "correct_option_index": 1,
        "explanation": "`map` applies the anonymous `lambda x: x * 2` function to each element of `[1, 2, 3]`, resulting in `[2, 4, 6]`."
    },
    {
        "question": "What is the purpose of the `__init__` method in Python classes?",
        "options": [
            "To destroy an object when garbage collected",
            "To initialize the attributes of a newly created instance",
            "To declare public static class variables",
            "To compile the Python bytecode"
        ],
        "correct_option_index": 1,
        "explanation": "`__init__` is the constructor method called automatically after a new instance of a class has been created."
    },
    {
        "question": "What does the `*args` syntax in a function signature allow?",
        "options": [
            "Passing keyword arguments as a dictionary",
            "Passing a variable number of non-keyword positional arguments",
            "Unpacking a list inside a loop",
            "Defining mandatory positional arguments"
        ],
        "correct_option_index": 1,
        "explanation": "`*args` collects extra positional arguments into a tuple passed into the function."
    },
    {
        "question": "What is the output of `print(isinstance(True, int))`?",
        "options": [
            "True",
            "False",
            "TypeError",
            "None"
        ],
        "correct_option_index": 0,
        "explanation": "In Python, `bool` is a subclass of `int` (`isinstance(True, int)` is `True`, and `True == 1`)."
    },
    {
        "question": "What does a generator function in Python use to return items one at a time?",
        "options": [
            "return",
            "yield",
            "emit",
            "send"
        ],
        "correct_option_index": 1,
        "explanation": "The `yield` statement suspends function execution and returns a value to the caller, turning the function into a generator."
    },
    {
        "question": "What is the difference between `is` and `==` in Python?",
        "options": [
            "`is` checks value equality; `==` checks object identity",
            "`is` checks object identity (same memory address); `==` checks value equality",
            "`is` is for strings only; `==` is for numbers only",
            "There is no difference"
        ],
        "correct_option_index": 1,
        "explanation": "`is` tests whether two variables point to the exact same object in memory, while `==` tests whether their evaluated values are equal."
    },
    {
        "question": "How do you open a file `data.txt` safely so it closes automatically even if an exception occurs?",
        "options": [
            "file = open('data.txt'); defer file.close()",
            "with open('data.txt') as file:",
            "try open('data.txt') as file:",
            "using open('data.txt') as file:"
        ],
        "correct_option_index": 1,
        "explanation": "The `with` statement utilizes context managers to ensure cleanup (closing the file handle) upon exiting the block."
    }
]
