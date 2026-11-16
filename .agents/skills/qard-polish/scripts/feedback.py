#!/usr/bin/env python3
"""Maintain current reusable feedback rules, without card records or history.

Callers judge semantic broadness and whether guidance reflects actual feedback.
Schema validation cannot judge rule text or the meaning of declared topics.
"""

import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import sys
import tempfile


def locate_store():
    here = Path(__file__).resolve()
    skill = here.parent.parent
    for parent in here.parents:
        if (parent / "rulesync.jsonc").is_file():
            return parent / ".rulesync" / "skill-feedback" / f"{skill.name}.json"
    return skill / "references" / "feedback.json"


STORE = locate_store()
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def valid_slug(value):
    return isinstance(value, str) and SLUG.fullmatch(value) is not None


def validate_rules(rules):
    require(isinstance(rules, dict), "rules must be an object")
    for key, guidance in rules.items():
        require(valid_slug(key), "invalid rule key")
        require(isinstance(guidance, str) and guidance.strip(), "guidance must be nonblank text")


def validate(store):
    require(isinstance(store, dict), "store must be an object")
    require(set(store) == {"version", "revision", "general", "topics"}, "invalid store fields")
    require(type(store["version"]) is int and store["version"] == 2, "unsupported version")
    require(type(store["revision"]) is int and store["revision"] >= 0, "invalid revision")
    validate_rules(store["general"])
    require(isinstance(store["topics"], dict), "topics must be an object")
    for topic, rules in store["topics"].items():
        require(valid_slug(topic), "invalid topic slug")
        validate_rules(rules)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON field")
        result[key] = value
    return result


def read_store():
    require(not STORE.is_symlink(), "feedback file symlinks are not allowed")
    descriptor = os.open(STORE, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, encoding="utf-8") as source:
        store = json.load(source, object_pairs_hook=unique_object)
    validate(store)
    return store


def replace_store(store):
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=STORE.parent, prefix=".feedback-", delete=False) as handle:
            name = handle.name
            json.dump(store, handle, indent=2, ensure_ascii=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, STORE)
    finally:
        if name is not None and os.path.exists(name):
            os.unlink(name)


def topic_rules(store, topic):
    require(valid_slug(topic), "invalid topic slug")
    require(topic in store["topics"], "undeclared topic")
    return store["topics"][topic]


def run(args):
    if args.command == "show":
        store = read_store()
        topics = {}
        if args.topic is not None:
            topics[args.topic] = topic_rules(store, args.topic)
        if args.all:
            topics = store["topics"]
        return {"revision": store["revision"], "general": store["general"], "topics": topics}

    descriptor = os.open(STORE.with_suffix(".lock"), os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "r+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        store = read_store()
        require(args.expected_revision >= 0, "invalid expected revision")
        require(store["revision"] == args.expected_revision, "stale revision")
        require(valid_slug(args.key), "invalid rule key")
        if args.scope == "general":
            rules = store["general"]
        else:
            require(args.scope.startswith("topic:"), "scope must be general or topic:<slug>")
            rules = topic_rules(store, args.scope[len("topic:"):])
        if args.command == "set":
            require(args.guidance.strip(), "guidance must be nonblank text")
            if rules.get(args.key) == args.guidance:
                return {"revision": store["revision"], "changed": False}
            rules[args.key] = args.guidance
        else:
            require(args.key in rules, "rule key does not exist in selected scope")
            del rules[args.key]
        store["revision"] += 1
        validate(store)
        replace_store(store)
        return {"revision": store["revision"], "changed": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    show = commands.add_parser("show")
    show.add_argument("--topic")
    show.add_argument("--all", action="store_true")
    for command in ("set", "delete"):
        write = commands.add_parser(command)
        write.add_argument("--expected-revision", type=int, required=True)
        write.add_argument("--scope", required=True)
        write.add_argument("--key", required=True)
        if command == "set":
            write.add_argument("--guidance", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(run(args), ensure_ascii=True))
    except (ValueError, OSError) as error:
        print("feedback: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
