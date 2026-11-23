require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const SchoolClass = require('../models/SchoolClass');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const runStartupTasks = require('../config/startup');

const seedData = [
  {
    className: 'Class 8',
    subject: 'Mathematics',
    bankName: 'Class 8 · Mathematics',
    questions: [
      {
        text: 'What is the additive inverse of -5/9?',
        options: ['5/9', '-9/5', '9/5', '0'],
        correctIndex: 0,
        explanation: 'The additive inverse of a number x is -x such that x + (-x) = 0.'
      },
      {
        text: 'Solve for x: 3x - 7 = 14',
        options: ['x = 7', 'x = 3', 'x = 5', 'x = 21'],
        correctIndex: 0,
        explanation: 'Adding 7 to both sides gives 3x = 21, and dividing by 3 yields x = 7.'
      },
      {
        text: 'What is the sum of all interior angles of a quadrilateral?',
        options: ['360°', '180°', '540°', '720°'],
        correctIndex: 0,
        explanation: 'The sum of the interior angles of any convex quadrilateral is (4 - 2) × 180° = 360°.'
      },
      {
        text: 'What is the square root of 576?',
        options: ['24', '26', '22', '28'],
        correctIndex: 0,
        explanation: '24 multiplied by 24 equals 576.'
      },
      {
        text: 'What is the cube of 7?',
        options: ['343', '243', '49', '512'],
        correctIndex: 0,
        explanation: '7 multiplied by 7 by 7 equals 343.'
      },
      {
        text: 'If 15 workers build a wall in 48 hours, how many hours will 30 workers take at the same rate?',
        options: ['24 hours', '96 hours', '12 hours', '36 hours'],
        correctIndex: 0,
        explanation: 'Number of workers and time taken are in inverse proportion, so 15 × 48 = 30 × 24.'
      },
      {
        text: 'Simplify the algebraic expression: (2x + 3y) + (4x - y)',
        options: ['6x + 2y', '6x + 4y', '8x + 2y', '2x + 2y'],
        correctIndex: 0,
        explanation: 'Combining like terms gives (2x + 4x) + (3y - y) = 6x + 2y.'
      },
      {
        text: 'Evaluate: 2^(-3)',
        options: ['1/8', '-8', '-6', '1/6'],
        correctIndex: 0,
        explanation: 'A negative exponent represents the reciprocal of the positive power, so 2^(-3) = 1/(2^3) = 1/8.'
      },
      {
        text: 'Find the area of a trapezium with parallel sides 8 cm and 12 cm, and height 5 cm.',
        options: ['50 cm²', '100 cm²', '40 cm²', '60 cm²'],
        correctIndex: 0,
        explanation: 'Area of a trapezium equals 1/2 × (sum of parallel sides) × height = 1/2 × 20 × 5 = 50 cm².'
      },
      {
        text: 'What is the probability of rolling an even number on a standard six-sided die?',
        options: ['1/2', '1/3', '1/6', '2/3'],
        correctIndex: 0,
        explanation: 'The even outcomes are 2, 4, and 6 out of 6 possible outcomes, giving 3/6 = 1/2.'
      },
      {
        text: 'A jacket is priced at $80 and offered with a 15% discount. What is the sale price?',
        options: ['$68', '$65', '$72', '$70'],
        correctIndex: 0,
        explanation: '15% of $80 is $12, so the sale price is $80 - $12 = $68.'
      },
      {
        text: 'What is the value of x if 2^(x+1) = 16?',
        options: ['3', '4', '2', '5'],
        correctIndex: 0,
        explanation: 'Since 16 = 2^4, equating exponents yields x + 1 = 4, so x = 3.'
      }
    ]
  },
  {
    className: 'Class 8',
    subject: 'Science',
    bankName: 'Class 8 · Science',
    questions: [
      {
        text: 'Which bacterium is responsible for turning milk into curd?',
        options: ['Lactobacillus', 'Rhizobium', 'Escherichia coli', 'Streptococcus pneumoniae'],
        correctIndex: 0,
        explanation: 'Lactobacillus promotes the curdling of milk by producing lactic acid.'
      },
      {
        text: 'Which of the following is a non-metal that exists as a liquid at room temperature?',
        options: ['Bromine', 'Mercury', 'Chlorine', 'Iodine'],
        correctIndex: 0,
        explanation: 'Bromine is the only non-metal that is liquid at standard room temperature and pressure.'
      },
      {
        text: 'What is the powerhouse organelle of the eukaryotic cell?',
        options: ['Mitochondria', 'Ribosome', 'Nucleus', 'Endoplasmic reticulum'],
        correctIndex: 0,
        explanation: 'Mitochondria generate most of the chemical energy needed by cellular biochemical reactions in the form of ATP.'
      },
      {
        text: 'Which gas is the primary supporter of combustion?',
        options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
        correctIndex: 0,
        explanation: 'Oxygen chemically reacts with fuel during combustion to sustain fire.'
      },
      {
        text: 'What is the SI unit of pressure?',
        options: ['Pascal', 'Newton', 'Joule', 'Watt'],
        correctIndex: 0,
        explanation: 'The SI unit of pressure is the Pascal (Pa), equivalent to one Newton per square metre.'
      },
      {
        text: 'Sound cannot travel through which of the following media?',
        options: ['Vacuum', 'Water', 'Air', 'Solid steel'],
        correctIndex: 0,
        explanation: 'Sound requires a physical material medium with particles to propagate mechanical waves.'
      },
      {
        text: 'Which planet in our solar system is commonly known as the Red Planet?',
        options: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
        correctIndex: 0,
        explanation: 'Mars appears reddish due to the prevalence of iron oxide on its surface.'
      },
      {
        text: 'Friction between moving machine parts can be reduced by using what?',
        options: ['Lubricants', 'Sand', 'Rough coatings', 'Adhesives'],
        correctIndex: 0,
        explanation: 'Lubricants create a smooth intervening film between surfaces to reduce frictional resistance.'
      },
      {
        text: 'The process of conversion of sugar into alcohol by yeast is called what?',
        options: ['Fermentation', 'Pasteurization', 'Sterilization', 'Oxidation'],
        correctIndex: 0,
        explanation: 'Fermentation is an anaerobic biochemical process where yeast converts carbohydrates into ethanol and carbon dioxide.'
      },
      {
        text: 'Which cell organelle contains the hereditary genetic material (DNA)?',
        options: ['Nucleus', 'Vacuole', 'Golgi apparatus', 'Lysosome'],
        correctIndex: 0,
        explanation: 'The cell nucleus houses chromosomes that store genetic DNA instructions.'
      },
      {
        text: 'What type of mirror is primarily used by dentists to view enlarged images of teeth?',
        options: ['Concave mirror', 'Convex mirror', 'Plane mirror', 'Cylindrical mirror'],
        correctIndex: 0,
        explanation: 'A concave mirror produces an upright, magnified virtual image when the object is held close.'
      },
      {
        text: 'Which metal is stored under kerosene oil to prevent spontaneous reaction with atmospheric oxygen?',
        options: ['Sodium', 'Aluminium', 'Magnesium', 'Copper'],
        correctIndex: 0,
        explanation: 'Sodium is an alkali metal that reacts vigorously with air and moisture, requiring immersion in kerosene.'
      }
    ]
  },
  {
    className: 'Class 10',
    subject: 'Mathematics',
    bankName: 'Class 10 · Mathematics',
    questions: [
      {
        text: 'If two positive integers a and b are expressed as a = p³q² and b = pq³ (where p and q are primes), what is HCF(a, b)?',
        options: ['pq²', 'p³q³', 'p²q', 'pq'],
        correctIndex: 0,
        explanation: 'The HCF is the product of the smallest powers of each common prime factor, which is p¹q².'
      },
      {
        text: 'What are the roots of the quadratic equation x² - 5x + 6 = 0?',
        options: ['2 and 3', '-2 and -3', '1 and 6', '-1 and -6'],
        correctIndex: 0,
        explanation: 'Factoring gives (x - 2)(x - 3) = 0, which yields roots x = 2 and x = 3.'
      },
      {
        text: 'Find the 10th term of the arithmetic progression 2, 7, 12, 17, ...',
        options: ['47', '45', '52', '50'],
        correctIndex: 0,
        explanation: 'Using a_n = a + (n - 1)d with a = 2 and d = 5 gives 2 + (9 × 5) = 47.'
      },
      {
        text: 'What is the distance between the points (0, 0) and (6, 8)?',
        options: ['10', '14', '12', '8'],
        correctIndex: 0,
        explanation: 'The distance formula gives √(6² + 8²) = √(36 + 64) = √100 = 10.'
      },
      {
        text: 'What is the exact value of sin²(30°) + cos²(30°)?',
        options: ['1', '0', '1/2', '√3/2'],
        correctIndex: 0,
        explanation: 'According to the fundamental Pythagorean trigonometric identity, sin²θ + cos²θ = 1 for any angle θ.'
      },
      {
        text: 'If tan θ = 4/3, what is the value of sec θ (for acute angle θ)?',
        options: ['5/3', '3/5', '5/4', '4/5'],
        correctIndex: 0,
        explanation: 'Using sec²θ = 1 + tan²θ gives 1 + 16/9 = 25/9, so sec θ = 5/3.'
      },
      {
        text: 'The discriminant of the quadratic equation 2x² - 4x + 3 = 0 is:',
        options: ['-8', '8', '40', '-40'],
        correctIndex: 0,
        explanation: 'Discriminant D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8.'
      },
      {
        text: 'How many tangents can be drawn to a circle from an external point?',
        options: ['Exactly 2', 'Exactly 1', 'Infinitely many', '0'],
        correctIndex: 0,
        explanation: 'From any point lying strictly outside a circle, exactly two distinct tangents can be drawn.'
      },
      {
        text: 'If the radius of a sphere is doubled, its surface area increases by a factor of what?',
        options: ['4', '2', '8', '16'],
        correctIndex: 0,
        explanation: 'Surface area is proportional to the square of the radius, so (2r)² = 4r².'
      },
      {
        text: 'The empirical relationship between the three measures of central tendency is:',
        options: ['3 Median = Mode + 2 Mean', 'Mode = 3 Mean - 2 Median', 'Median = 3 Mode - 2 Mean', '2 Median = 3 Mode + Mean'],
        correctIndex: 0,
        explanation: 'The standard empirical formula relating central measures is 3 Median = Mode + 2 Mean.'
      },
      {
        text: 'A card is drawn from a well-shuffled pack of 52 cards. What is the probability of drawing a face card?',
        options: ['3/13', '1/13', '4/13', '1/4'],
        correctIndex: 0,
        explanation: 'There are 12 face cards (Jack, Queen, King in 4 suits) in a deck of 52 cards, giving 12/52 = 3/13.'
      },
      {
        text: 'If the perimeter and area of a circle are numerically equal, what is the radius of the circle?',
        options: ['2 units', 'π units', '4 units', '1 unit'],
        correctIndex: 0,
        explanation: 'Equating 2πr = πr² (for r > 0) results in r = 2 units.'
      }
    ]
  },
  {
    className: 'Class 10',
    subject: 'English',
    bankName: 'Class 10 · English',
    questions: [
      {
        text: 'Identify the poetic device used in: "The wind whispered through the dark trees."',
        options: ['Personification', 'Simile', 'Oxymoron', 'Hyperbole'],
        correctIndex: 0,
        explanation: 'Personification attributes human qualities like whispering to non-human elements such as the wind.'
      },
      {
        text: 'Choose the correct passive voice: "The chef prepared a delectable meal."',
        options: [
          'A delectable meal was prepared by the chef.',
          'A delectable meal is prepared by the chef.',
          'A delectable meal has been prepared by the chef.',
          'A delectable meal was being prepared by the chef.'
        ],
        correctIndex: 0,
        explanation: 'Past simple active "prepared" converts to past simple passive "was prepared".'
      },
      {
        text: 'Select the sentence with correct subject-verb agreement:',
        options: [
          'Neither the teacher nor the students were present.',
          'Neither the teacher nor the students was present.',
          'Neither the teachers nor the student were present.',
          'Each of the students have finished the test.'
        ],
        correctIndex: 0,
        explanation: 'When subjects are connected by "neither... nor", the verb agrees with the closer subject ("students were").'
      },
      {
        text: 'What does the idiom "burn the midnight oil" mean?',
        options: [
          'Work or study late into the night',
          'Waste precious electrical resources',
          'Cause unnecessary conflict',
          'Wake up very early in the morning'
        ],
        correctIndex: 0,
        explanation: 'Burning the midnight oil refers to remaining awake late working diligently.'
      },
      {
        text: 'Fill in the blank with the appropriate modal: "You ______ stop at the red traffic signal; it is the law."',
        options: ['must', 'might', 'could', 'should'],
        correctIndex: 0,
        explanation: '"Must" indicates compulsory legal obligation.'
      },
      {
        text: 'Which sentence correctly uses indirect speech for: She said, "I have completed my homework"?',
        options: [
          'She said that she had completed her homework.',
          'She said that she has completed her homework.',
          'She said that she completed her homework.',
          'She said that I had completed my homework.'
        ],
        correctIndex: 0,
        explanation: 'In reported speech, present perfect "have completed" shifts back into past perfect "had completed".'
      },
      {
        text: 'Identify the figure of speech comparing two distinct things using "like" or "as":',
        options: ['Simile', 'Metaphor', 'Alliteration', 'Irony'],
        correctIndex: 0,
        explanation: 'A simile directly compares two different things explicitly using "like" or "as".'
      },
      {
        text: 'Choose the correct antonym for the word "BENEVOLENT":',
        options: ['Malevolent', 'Generous', 'Compassionate', 'Altruistic'],
        correctIndex: 0,
        explanation: 'Benevolent means well-meaning and kind, whereas malevolent means wishing harm to others.'
      },
      {
        text: 'Select the correctly punctuated sentence:',
        options: [
          'However, the weather remained stormy all afternoon.',
          'However the weather, remained stormy all afternoon.',
          'However the weather remained stormy, all afternoon.',
          'However, the weather, remained stormy all afternoon.'
        ],
        correctIndex: 0,
        explanation: 'An introductory conjunctive adverb like "However" is cleanly set off with a single trailing comma.'
      },
      {
        text: 'What is the literary term for repetition of initial consonant sounds in adjacent words?',
        options: ['Alliteration', 'Assonance', 'Onomatopoeia', 'Rhyme scheme'],
        correctIndex: 0,
        explanation: 'Alliteration is the repetition of the same initial consonant sound in a phrase or verse.'
      },
      {
        text: 'Fill in the blank with the correct conditional form: "If she studied regularly, she ______ the exam easily."',
        options: ['would pass', 'will pass', 'would have passed', 'passed'],
        correctIndex: 0,
        explanation: 'Second conditional sentences employ past simple in the if-clause and "would + base verb" in the main clause.'
      },
      {
        text: 'Choose the word that best completes the sentence: "The scientist presented a ______ argument that convinced everyone."',
        options: ['compelling', 'compelled', 'compulsion', 'compulsively'],
        correctIndex: 0,
        explanation: '"Compelling" is the adjective modifying "argument", meaning powerfully persuasive.'
      }
    ]
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is required to run seed script.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding.');

    // Ensure startup tasks ran (creates Class 1-12 & Main Admin)
    await runStartupTasks();

    for (const bankData of seedData) {
      let schoolClass = await SchoolClass.findOne({ name: bankData.className });
      if (!schoolClass) {
        schoolClass = await SchoolClass.create({
          name: bankData.className,
          order: parseInt(bankData.className.replace(/\D/g, ''), 10) || 0
        });
      }

      let bank = await QuestionBank.findOne({
        classId: schoolClass._id,
        subject: bankData.subject
      });

      if (!bank) {
        bank = await QuestionBank.create({
          classId: schoolClass._id,
          subject: bankData.subject,
          name: bankData.bankName,
          archived: false
        });
        console.log(`Created bank: ${bankData.bankName}`);
      } else {
        console.log(`Bank already exists: ${bankData.bankName}`);
      }

      // Check existing questions
      const existingQuestionCount = await Question.countDocuments({ bankId: bank._id });
      if (existingQuestionCount === 0) {
        const questionDocs = bankData.questions.map(q => ({
          bankId: bank._id,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          archived: false
        }));
        await Question.insertMany(questionDocs);
        console.log(`Inserted 12 questions for ${bankData.bankName}`);
      } else {
        console.log(`Questions already exist for ${bankData.bankName} (${existingQuestionCount} found). Skipping duplicate insertion.`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
