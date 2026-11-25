COMMENT_TEMPLATES = {
    "general": [
        "Thanks for sharing this with everyone!",
        "I really appreciate this community.",
        "Glad to see neighbors connecting.",
        "This is why I enjoy living here.",
        "Thanks for keeping everyone updated.",
    ],
    "recommendations": [
        "I'd love to hear some recommendations too.",
        "You might want to ask in the local community group.",
        "I've been looking for something similar.",
        "Hopefully someone here can recommend a good option.",
        "Please share an update if you find someone.",
    ],
    "events": [
        "This sounds like a great idea!",
        "I'd definitely be interested in joining.",
        "Please keep us updated on the details.",
        "Happy to volunteer if you need help.",
        "Looking forward to meeting more neighbors.",
    ],
    "pets": [
        "Always happy to meet other pet owners!",
        "I'd love to hear more about this.",
        "Thanks for sharing this with local pet owners.",
        "We should organize a neighborhood pet meetup.",
        "This would be helpful for new pet owners.",
    ],
    "safety": [
        "Thanks for bringing attention to this.",
        "It's important that we look out for each other.",
        "Everyone should stay aware and be careful.",
        "I appreciate the reminder.",
        "Keeping our neighborhood safe is important.",
    ],
    "gardening": [
        "I'd love to learn more about gardening.",
        "A community garden would be wonderful.",
        "Thanks for sharing these gardening ideas.",
        "I've been interested in trying this too.",
        "Looking forward to hearing everyone's advice.",
    ],
    "assistance": [
        "Happy to help if needed!",
        "That's very thoughtful of you.",
        "It's great seeing neighbors support each other.",
        "Please let us know how we can help.",
        "Thank you for giving back to the community.",
    ],
}


CATEGORY_KEYWORDS = {
    "pets": [
        "pet", "dog", "cat", "puppy", "kitten",
    ],
    "gardening": [
        "garden", "plant", "seeds", "growing",
    ],
    "safety": [
        "safety", "streetlights", "after dark",
        "drive slowly",
    ],
    "events": [
        "event", "meetup", "hosting", "volunteers",
    ],
    "assistance": [
        "donate", "assistance", "extra", "exchange",
    ],
    "recommendations": [
        "recommend", "suggestions", "looking for",
    ],
}


def get_comment_category(post_content):
    content = post_content.lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in content for keyword in keywords):
            return category

    return "general"


def generate_comment_content(index, post_content, rng):
    category = get_comment_category(post_content)

    content = rng.choice(
        COMMENT_TEMPLATES[category]
    )

    return f"{content}\n\n[Demo comment #{index:05d}]"