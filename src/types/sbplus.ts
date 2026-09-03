export interface XmlAttributes {
    [key: string]: string | undefined;
}

export interface StorybookXml {
    storybook: StorybookRoot;
}

export interface StorybookRoot {
    $?: XmlAttributes;
    setup: Setup;
    section: Section[];
}

export interface Setup {
    $?: XmlAttributes;
    splashImg?: string;
    title: string;
    subtitle?: string;
    length?: string;
    author?: Author;
    generalInfo?: string;
}

export interface Author {
    $?: XmlAttributes; // name attribute
    _: string | undefined; // CDATA content
}

export interface Section {
    $?: XmlAttributes; // contains title=""
    page: Page[];
}

export interface Page {
    $?: XmlAttributes; // type, src, title, transition, preventAutoplay
    note?: string;
    description?: string;
    copyableContent?: string;
    audio?: { $?: XmlAttributes }; // for HTML pages with <audio />
    frame?: Frame[];
    markers?: { marker: Marker[] };
    widget?: Widget;
    multipleChoiceSingle?: QuizSingle;
    multipleChoiceMultiple?: QuizMultiple;
    shortAnswer?: ShortAnswer;
    fillInTheBlank?: FillInTheBlank;
}

export interface Frame {
    $?: XmlAttributes; // contains start
}

export interface Marker {
    $?: XmlAttributes; // timecode, color
    _: string | undefined; // optional marker label
}

export interface Widget {
    $?: XmlAttributes;
    segment: Segment[];
}

export interface Segment {
    $?: XmlAttributes;
    _: string;
}

export interface QuizSingle {
    $?: XmlAttributes;
    question: Question;
    choices: QuizChoices;
}

export interface QuizMultiple {
    $?: XmlAttributes;
    question: Question;
    choices: QuizChoices;
    correctFeedback?: string;
    incorrectFeedback?: string;
}

export interface Question {
    $?: XmlAttributes; // image, audio
    _: string; // HTML or text
}

export interface QuizChoices {
    $?: XmlAttributes;
    answer: QuizAnswer[];
}

export interface QuizAnswer {
    $?: XmlAttributes; // correct, image, audio
    value?: string;
    feedback?: string;
}

export interface ShortAnswer {
    $?: XmlAttributes;
    question: string;
    feedback: string;
}

export interface FillInTheBlank {
    $?: XmlAttributes;
    question: string;
    answer: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
}
