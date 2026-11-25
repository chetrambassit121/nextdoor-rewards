POST_TEMPLATES = {
    "general": [
        "Anyone else enjoying the {weather} weather lately?",
        "Just moved into the neighborhood near {place}. Happy to be here!",
        "Really appreciate how friendly everyone has been around {place}.",
        "Went for a walk near {place} {time}. Such a lovely neighborhood.",
        "What is everyone's favorite thing about living near {place}?",
    ],
    "recommendations": [
        "Can anyone recommend a reliable {service}?",
        "Looking for a good {service} near {place}. Any suggestions?",
        "Does anyone know an affordable {service} in the neighborhood?",
        "Has anyone recently hired a {service}? Would love some recommendations.",
        "Looking for a trustworthy {service}. Thanks in advance!",
    ],
    "questions": [
        "Does anyone know when {place} gets the busiest?",
        "Where is the best place to buy {item} locally?",
        "Is there a community group for people interested in {activity}?",
        "Anyone know a good spot for {activity} near {place}?",
        "What are some fun things to do around {place} {time}?",
    ],
    "events": [
        "Planning a neighborhood {event} {time}. Anyone interested?",
        "Would anyone like to help organize a {event} near {place}?",
        "Thinking about hosting a {event}. Everyone is welcome!",
        "Anyone interested in joining a {event} near {place} {time}?",
        "Looking for volunteers for a community {event}.",
    ],
    "pets": [
        "Looking for recommendations for a local {pet_service}.",
        "Does anyone have tips for taking care of a new {pet}?",
        "Would anyone be interested in a {pet} owners meetup?",
        "Looking for a pet-friendly walking route near {place}.",
        "My {pet} loves our walks around {place}. Anyone else?",
    ],
    "safety": [
        "Remember to stay visible when walking near {place} after dark.",
        "A friendly reminder to drive slowly around residential streets.",
        "Does anyone know how to report broken streetlights near {place}?",
        "What are some good neighborhood safety tips for new residents?",
        "Would anyone be interested in a neighborhood safety discussion?",
    ],
    "gardening": [
        "Has anyone tried growing {plant} in their backyard?",
        "Looking for gardening advice for growing {plant}.",
        "Does anyone have extra {plant} seeds to share?",
        "Thinking about starting a community garden near {place}.",
        "What is the best time of year to plant {plant}?",
    ],
    "assistance": [
        "I have some extra {item} available if anyone needs them.",
        "Would anyone like to help with a community {event}?",
        "Happy to help neighbors who need assistance with {activity}.",
        "Does anyone know where I can donate {item} locally?",
        "Looking to organize a neighborhood exchange for {item}.",
    ],
}


CATEGORY_WEIGHTS = {
    "general": 20,
    "recommendations": 15,
    "questions": 15,
    "events": 10,
    "pets": 10,
    "safety": 10,
    "gardening": 10,
    "assistance": 10,
}


OPTIONS = {
    "weather": [
        "sunny", "cool", "warm", "breezy", "pleasant",
    ],
    "place": [
        "the community park",
        "the library",
        "the recreation center",
        "the playground",
        "the local shopping area",
        "the community garden",
        "the walking trail",
        "the farmers market",
    ],
    "service": [
        "plumber",
        "electrician",
        "handyman",
        "house cleaner",
        "landscaper",
        "mechanic",
        "painter",
        "carpenter",
        "dog walker",
        "roofing contractor",
    ],
    "item": [
        "books",
        "garden tools",
        "household supplies",
        "winter clothes",
        "children's toys",
        "furniture",
        "school supplies",
        "plant pots",
    ],
    "activity": [
        "gardening",
        "walking",
        "cycling",
        "photography",
        "volunteering",
        "painting",
        "reading",
        "yoga",
    ],
    "event": [
        "cleanup",
        "picnic",
        "book exchange",
        "food drive",
        "yard sale",
        "walking meetup",
        "plant exchange",
        "community gathering",
    ],
    "pet": [
        "dog", "cat", "puppy", "kitten",
    ],
    "pet_service": [
        "veterinarian",
        "pet groomer",
        "pet sitter",
        "dog walker",
        "dog trainer",
    ],
    "plant": [
        "tomatoes",
        "basil",
        "mint",
        "roses",
        "peppers",
        "lavender",
        "cucumbers",
        "sunflowers",
    ],
    "time": [
        "this morning",
        "this afternoon",
        "this weekend",
        "next Saturday",
        "next Sunday",
    ],
}


CLOSING_PHRASES = [
    "",
    "Thanks, neighbors!",
    "Any suggestions are appreciated.",
    "Would love to hear your thoughts.",
    "Hope everyone is having a great day!",
    "Let me know what you think.",
    "Looking forward to hearing from everyone.",
    "Thanks for being such a helpful community.",
]


def generate_post_content(index, rng):
    category = rng.choices(
        population=list(CATEGORY_WEIGHTS),
        weights=list(CATEGORY_WEIGHTS.values()),
        k=1,
    )[0]

    template = rng.choice(POST_TEMPLATES[category])

    values = {
        key: rng.choice(options)
        for key, options in OPTIONS.items()
    }

    content = template.format(**values)

    closing = rng.choice(CLOSING_PHRASES)

    if closing:
        content = f"{content} {closing}"

    # Stable identifier for duplicate prevention.
    return f"{content}\n\n[Demo post #{index:05d}]"