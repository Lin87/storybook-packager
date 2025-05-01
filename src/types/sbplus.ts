export interface StorybookXml {
    storybook: {
      accent?: string;
      pageImgFormat?: string;
      splashImgFormat?: string;
      analytics?: string;
      mathjax?: string;
      downloadableFileName?: string;
      setup: Setup;
      section: Section[] | Section;
    };
  }
  
  export interface Setup {
    splashImg?: string;
    title: string;
    subtitle?: string;
    length?: string;
    author: {
      name: string;
      value?: string; // CDATA content
    };
    generalInfo?: string; // CDATA content
  }
  
  export interface Section {
    title?: string;
    page: Page[] | Page;
  }
  
  export interface Page {
    type: string;
    src?: string;
    title?: string;
    transition?: string;
    preventAutoplay?: string;
    note?: string;
    description?: string;
    copyableContent?: string;
    frame?: Frame[] | Frame;
    markers?: Marker[] | Marker;
    widget?: Widget;
    multipleChoiceSingle?: QuizSingle;
    multipleChoiceMultiple?: QuizMultiple;
    shortAnswer?: ShortAnswer;
    fillInTheBlank?: FillInTheBlank;
  }
  
  export interface Frame {
    start: string;
  }
  
  export interface Marker {
    timecode: string;
    color?: string;
    value: string;
  }
  
  export interface Widget {
    segment: Segment[] | Segment;
  }
  
  export interface Segment {
    name: string;
    value: string;
  }
  
  export interface QuizSingle {
    question: Question;
    choices: QuizChoices;
  }
  
  export interface QuizMultiple {
    question: Question;
    choices: QuizChoices;
    correctFeedback?: string;
    incorrectFeedback?: string;
  }
  
  export interface Question {
    image?: string;
    audio?: string;
    value: string;
  }
  
  export interface QuizChoices {
    answer: QuizAnswer[] | QuizAnswer;
  }
  
  export interface QuizAnswer {
    value: string;
    correct?: string;
    feedback?: string;
    image?: string;
    audio?: string;
  }
  
  export interface ShortAnswer {
    question: string;
    feedback: string;
  }
  
  export interface FillInTheBlank {
    question: string;
    answer: string;
    correctFeedback: string;
    incorrectFeedback: string;
  }
  