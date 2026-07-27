"""
Python Concept Taxonomy for Assessment Question Generation
Curated fixed taxonomy divided into Basic, Intermediate, and Deep/Advanced tiers.
"""

BASIC_CONCEPTS = [
    "variables_types",
    "string_operations",
    "lists",
    "dictionaries",
    "loops",
    "conditionals",
    "basic_functions",
    "tuples",
    "sets",
    "basic_file_io",
    "basic_exceptions",
    "string_formatting",
    "input_output",
    "basic_math",
    "boolean_logic"
]

INTERMEDIATE_CONCEPTS = [
    "comprehensions",
    "args_kwargs",
    "default_args",
    "lambda_functions",
    "decorators_basic",
    "generators_yield",
    "iterators_protocol",
    "context_managers",
    "oop_classes",
    "oop_polymorphism",
    "custom_exceptions",
    "closures",
    "scope_legb",
    "modules_packages",
    "itertools_basics",
    "collections_module",
    "advanced_string_methods",
    "sorting_custom_keys",
    "slicing_advanced",
    "extended_unpacking",
    "fstrings_internals"
]

DEEP_CONCEPTS = [
    "decorators_args",
    "genexpr_vs_listcomp",
    "gil_implications",
    "mutable_identity_bugs",
    "metaclasses_conceptual",
    "descriptors_conceptual",
    "functools_module",
    "multiple_inheritance_mro",
    "exception_chaining",
    "async_await_basics",
    "memory_refcounting",
    "dunder_methods",
    "deep_shallow_copy",
    "thread_safety_basics",
    "complexity_builtins"
]

TAXONOMY_BY_TIER = {
    "basic": BASIC_CONCEPTS,
    "intermediate": INTERMEDIATE_CONCEPTS,
    "deep": DEEP_CONCEPTS
}

