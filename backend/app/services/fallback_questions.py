"""
Fallback Python Question Bank tagged with taxonomy concept_key, tier, and scenario_theme.
Provides offline/fallback question generation matching the taxonomy requirements.
"""

FALLBACK_QUESTIONS = [
    # --- BASIC TIERS ---
    {
        "question": "In an e-commerce inventory app, what will type(item_count) return if item_count = 42?",
        "options": ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'list'>"],
        "correct_option_index": 0,
        "explanation": "An unquoted integer literal evaluates to <class 'int'> in Python.",
        "tier": "basic",
        "concept_key": "variables_types",
        "scenario_theme": "ecommerce_inventory"
    },
    {
        "question": "In a banking system, which expression evaluates to True to confirm a non-empty transaction history?",
        "options": ["bool('')", "bool([100.5])", "bool(None)", "bool(0)"],
        "correct_option_index": 1,
        "explanation": "In Python, non-empty collections like [100.5] evaluate to True in a boolean context.",
        "tier": "basic",
        "concept_key": "boolean_logic",
        "scenario_theme": "banking_transactions"
    },
    {
        "question": "In a restaurant order tracker, what is the value of total_bill // 3 when total_bill = 10?",
        "options": ["3.33", "3", "3.0", "1"],
        "correct_option_index": 1,
        "explanation": "The // floor division operator returns integer 3 without decimals.",
        "tier": "basic",
        "concept_key": "basic_math",
        "scenario_theme": "restaurant_orders"
    },
    {
        "question": "In a library catalog program, how do you add a new book title to book_list?",
        "options": ["book_list.add(title)", "book_list.push(title)", "book_list.append(title)", "book_list.insert(title)"],
        "correct_option_index": 2,
        "explanation": "append() adds a single element to the end of a Python list.",
        "tier": "basic",
        "concept_key": "lists",
        "scenario_theme": "library_catalog"
    },
    {
        "question": "In a school grading system, what will len({'alice': 90, 'bob': 85, 'alice': 95}) return?",
        "options": ["3", "2", "1", "TypeError"],
        "correct_option_index": 1,
        "explanation": "Dictionary keys are unique. Re-assigning key 'alice' updates its value, keeping length as 2.",
        "tier": "basic",
        "concept_key": "dictionaries",
        "scenario_theme": "school_grading"
    },

    # --- INTERMEDIATE TIERS ---
    {
        "question": "In a weather monitoring app, what is the output of [t for t in temperatures if t > 30] when temperatures = [28, 32, 25, 35]?",
        "options": ["[28, 32]", "[32, 35]", "[25, 35]", "[30, 35]"],
        "correct_option_index": 1,
        "explanation": "The list comprehension filters items greater than 30, returning [32, 35].",
        "tier": "intermediate",
        "concept_key": "comprehensions",
        "scenario_theme": "weather_data"
    },
    {
        "question": "In a ride-sharing trip manager, consider def log_trip(trip_id, history=[]): history.append(trip_id); return history. What is returned by consecutive calls log_trip(101) then log_trip(102)?",
        "options": ["[101] then [102]", "[101] then [101, 102]", "[101, 102] then [101, 102]", "TypeError"],
        "correct_option_index": 1,
        "explanation": "Default argument values are created once at function definition time. The mutable list persists across calls.",
        "tier": "intermediate",
        "concept_key": "default_args",
        "scenario_theme": "ridesharing_trips"
    },
    {
        "question": "In a hospital record system, what does *records in def archive_patient(*records): capture?",
        "options": ["A dictionary of keyword arguments", "A tuple of positional arguments", "A list of strings", "A set of record IDs"],
        "correct_option_index": 1,
        "explanation": "*args (or *records) packs arbitrary positional parameters into a single tuple inside the function.",
        "tier": "intermediate",
        "concept_key": "args_kwargs",
        "scenario_theme": "hospital_records"
    },
    {
        "question": "In a game leaderboard system, how can player scores [('PlayerA', 50), ('PlayerB', 90)] be sorted by score descending?",
        "options": [
            "sorted(players, key=lambda p: p[1], reverse=True)",
            "players.sort(key=lambda p: p[0])",
            "sorted(players, reverse=False)",
            "players.order_by(score)"
        ],
        "correct_option_index": 0,
        "explanation": "sorted() with key=lambda p: p[1] and reverse=True sorts tuples by score in descending order.",
        "tier": "intermediate",
        "concept_key": "sorting_custom_keys",
        "scenario_theme": "game_leaderboard"
    },
    {
        "question": "In an IoT sensor application, what does a generator function use to stream sensor readings one by one?",
        "options": ["return", "yield", "emit", "send"],
        "correct_option_index": 1,
        "explanation": "yield pauses the generator execution state and yields an item to the caller.",
        "tier": "intermediate",
        "concept_key": "generators_yield",
        "scenario_theme": "iot_sensors"
    },
    {
        "question": "In an employee payroll script, what is the best way to ensure payroll file handles close automatically?",
        "options": [
            "f = open('payroll.csv'); defer f.close()",
            "with open('payroll.csv') as f:",
            "try open('payroll.csv') as f:",
            "using open('payroll.csv') as f:"
        ],
        "correct_option_index": 1,
        "explanation": "The with context manager safely closes open files upon block exit.",
        "tier": "intermediate",
        "concept_key": "context_managers",
        "scenario_theme": "employee_payroll"
    },

    # --- DEEP TIERS ---
    {
        "question": "In a fitness tracking app, what is the primary memory advantage of a generator expression (step for step in daily_steps) over a list comprehension [step for step in daily_steps]?",
        "options": [
            "Generators process items faster in CPU single-threads",
            "Generators yield elements lazily one by one without storing the whole sequence in memory",
            "List comprehensions cannot be iterated over twice",
            "Generators automatically bypass the CPython GIL"
        ],
        "correct_option_index": 1,
        "explanation": "Generator expressions compute values lazily, requiring O(1) memory overhead compared to list comprehensions.",
        "tier": "deep",
        "concept_key": "genexpr_vs_listcomp",
        "scenario_theme": "fitness_tracking"
    },
    {
        "question": "In a chat application, what does @functools.lru_cache(maxsize=128) do when placed on a get_user_profile(user_id) function?",
        "options": [
            "Limits the number of concurrent chat connections to 128",
            "Memoizes function calls by caching up to 128 distinct return values",
            "Enforces thread safety using a mutex lock",
            "Compiles function code to C extensions"
        ],
        "correct_option_index": 1,
        "explanation": "lru_cache caches function returns based on argument values up to maxsize using a Least Recently Used eviction strategy.",
        "tier": "deep",
        "concept_key": "functools_module",
        "scenario_theme": "chat_application"
    },
    {
        "question": "In a parking reservation engine, what occurs when executing raise ReservationError('Spot taken') from err inside a try/except block?",
        "options": [
            "The original exception err is suppressed and discarded",
            "The new exception sets __cause__ to err for explicit exception chaining",
            "The Python interpreter crashes instantly",
            "The reservation engine falls back to an async event loop"
        ],
        "correct_option_index": 1,
        "explanation": "raise ... from ... explicitly chains exceptions, setting __cause__ to preserve tracebacks.",
        "tier": "deep",
        "concept_key": "exception_chaining",
        "scenario_theme": "parking_system"
    },
    {
        "question": "In a ticket booking platform, what is the difference between copy.copy(ticket_data) (shallow copy) and copy.deepcopy(ticket_data) (deep copy)?",
        "options": [
            "Shallow copy duplicates nested mutable structures; deep copy copies outer attributes only",
            "Shallow copy constructs a new collection with references to nested objects; deep copy recursively duplicates all nested objects",
            "Shallow copy works only on primitive strings; deep copy works only on lists",
            "There is no functional difference"
        ],
        "correct_option_index": 1,
        "explanation": "copy.copy creates a shallow clone referencing child objects, while copy.deepcopy recursively copies all nested data.",
        "tier": "deep",
        "concept_key": "deep_shallow_copy",
        "scenario_theme": "ticket_booking"
    }
]

FALLBACK_BASIC_QUESTIONS = [q for q in FALLBACK_QUESTIONS if q.get('tier') == 'basic']
FALLBACK_INTERMEDIATE_QUESTIONS = [q for q in FALLBACK_QUESTIONS if q.get('tier') in ('intermediate', 'deep')]
