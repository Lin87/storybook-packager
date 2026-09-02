'use client';

import { EditorPanel, Field, SelectField, Toggle, UploadField } from '@/app/components/EditorFormControls';
import { showToast } from '@/app/utils/toast';
import {
    createEmptyAnswer,
    getQuizSubtype,
    PAGE_TYPE_LABELS,
    PAGE_TYPES,
    QUIZ_SUBTYPES,
    type QuizSubtype,
    type SupportedPageType,
} from '@/editor/pageModel';
import type { Page, QuizAnswer, XmlAttributes } from '@/types/sbplus';
import type { PageEditorProps } from './types';
import RichTextEditor from './RichTextEditor';
import { usePageEditorState } from './usePageEditorState';

function updateAttrs(attrs: XmlAttributes | undefined, field: string, value: string | undefined) {
    const nextAttrs = { ...(attrs ?? {}) };
    if (value === undefined) {
        delete nextAttrs[field];
    } else {
        nextAttrs[field] = value;
    }
    return nextAttrs;
}

function isChecked(value: string | undefined) {
    return value === 'true' || value === 'yes' || value === 'on';
}

const QUIZ_SUBTYPE_LABELS: Record<QuizSubtype, string> = {
    multipleChoiceSingle: 'Multiple Choice',
    multipleChoiceMultiple: 'Multiple Answer',
    shortAnswer: 'Short Answer',
    fillInTheBlank: 'Fill in the Blank',
};

function getAnswers(page: Page): QuizAnswer[] {
    if (page.multipleChoiceSingle?.choices?.answer) return page.multipleChoiceSingle.choices.answer;
    if (page.multipleChoiceMultiple?.choices?.answer) return page.multipleChoiceMultiple.choices.answer;
    return [];
}

function getQuestionValue(page: Page): string {
    if (page.multipleChoiceSingle) return page.multipleChoiceSingle.question._ ?? '';
    if (page.multipleChoiceMultiple) return page.multipleChoiceMultiple.question._ ?? '';
    if (page.shortAnswer) return page.shortAnswer.question ?? '';
    if (page.fillInTheBlank) return page.fillInTheBlank.question ?? '';
    return '';
}

function getQuestionAttrs(page: Page): XmlAttributes | undefined {
    if (page.multipleChoiceSingle?.question.$) return page.multipleChoiceSingle.question.$;
    if (page.multipleChoiceMultiple?.question.$) return page.multipleChoiceMultiple.question.$;
    if (page.shortAnswer?.$) return page.shortAnswer.$;
    if (page.fillInTheBlank?.$) return page.fillInTheBlank.$;
    return { image: '', audio: '' };
}

export default function QuizPageEditor({ sectionIndex, pageIndex }: PageEditorProps) {
    const { dispatch, page, state } = usePageEditorState(sectionIndex, pageIndex);

    if (!page) return <div className='text-sm opacity-70'>Page not found.</div>;

    const subtype = getQuizSubtype(page);
    const questionAttrs = getQuestionAttrs(page);
    const answers = getAnswers(page);

    const replacePage = (nextPage: Page) => {
        dispatch({
            type: 'replacePage',
            payload: { sectionIndex, pageIndex, page: nextPage },
        });
    };

    const updateQuestionAttr = (field: string, value: string | undefined) => {
        if (page.multipleChoiceSingle) {
            replacePage({
                ...page,
                multipleChoiceSingle: {
                    ...page.multipleChoiceSingle,
                    question: {
                        ...page.multipleChoiceSingle.question,
                        $: updateAttrs(page.multipleChoiceSingle.question.$, field, value),
                    },
                },
            });
            return;
        }

        if (page.multipleChoiceMultiple) {
            replacePage({
                ...page,
                multipleChoiceMultiple: {
                    ...page.multipleChoiceMultiple,
                    question: {
                        ...page.multipleChoiceMultiple.question,
                        $: updateAttrs(page.multipleChoiceMultiple.question.$, field, value),
                    },
                },
            });
            return;
        }

        if (page.shortAnswer) {
            replacePage({
                ...page,
                shortAnswer: {
                    ...page.shortAnswer,
                    $: updateAttrs(page.shortAnswer.$, field, value),
                },
            });
            return;
        }

        if (page.fillInTheBlank) {
            replacePage({
                ...page,
                fillInTheBlank: {
                    ...page.fillInTheBlank,
                    $: updateAttrs(page.fillInTheBlank.$, field, value),
                },
            });
        }
    };

    const updateQuestionValue = (value: string) => {
        if (page.multipleChoiceSingle) {
            replacePage({
                ...page,
                multipleChoiceSingle: {
                    ...page.multipleChoiceSingle,
                    question: { ...page.multipleChoiceSingle.question, _: value },
                },
            });
            return;
        }

        if (page.multipleChoiceMultiple) {
            replacePage({
                ...page,
                multipleChoiceMultiple: {
                    ...page.multipleChoiceMultiple,
                    question: { ...page.multipleChoiceMultiple.question, _: value },
                },
            });
            return;
        }

        if (page.shortAnswer) {
            replacePage({
                ...page,
                shortAnswer: {
                    ...page.shortAnswer,
                    question: value,
                },
            });
            return;
        }

        if (page.fillInTheBlank) {
            replacePage({
                ...page,
                fillInTheBlank: {
                    ...page.fillInTheBlank,
                    question: value,
                },
            });
        }
    };

    const importQuizAsset = async (kind: 'quiz-image' | 'quiz-audio', sourceName: string | undefined) => {
        const trimmedSourceName = sourceName?.trim();
        if (!trimmedSourceName) {
            showToast('Set the asset filename before importing.', 'warning');
            return;
        }

        const result = await window.electronAPI.importPresentationAsset({
            presentationPath: state.presentationPath,
            kind,
            sourceName: trimmedSourceName,
        });

        if (result.success) {
            showToast('Asset imported.', 'success');
            return;
        }

        if (result.error !== 'Import canceled.') {
            showToast(result.error, 'error');
        }
    };

    return (
        <div className='space-y-6'>
            <EditorPanel>
                <div className='grid gap-4 md:grid-cols-2'>
                    <SelectField
                        label='Page Type'
                        value='quiz'
                        onChange={(value) =>
                            dispatch({
                                type: 'changePageType',
                                payload: {
                                    sectionIndex,
                                    pageIndex,
                                    pageType: value as SupportedPageType,
                                },
                            })
                        }>
                            {PAGE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {PAGE_TYPE_LABELS[type]}
                                </option>
                            ))}
                    </SelectField>

                    <Field
                        label='Title'
                        value={page.$?.title ?? ''}
                        onChange={(value) =>
                            dispatch({
                                type: 'updatePageAttr',
                                payload: { sectionIndex, pageIndex, field: 'title', value },
                            })
                        }
                    />
                </div>

                <SelectField
                    label='Quiz Type'
                    value={subtype}
                    onChange={(value) =>
                        dispatch({
                            type: 'changeQuizSubtype',
                            payload: {
                                sectionIndex,
                                pageIndex,
                                quizSubtype: value as QuizSubtype,
                            },
                        })
                    }>
                    {QUIZ_SUBTYPES.map((value) => (
                        <option key={value} value={value}>
                            {QUIZ_SUBTYPE_LABELS[value]}
                        </option>
                    ))}
                </SelectField>
            </EditorPanel>

            <EditorPanel>
                <div className='grid gap-4 md:grid-cols-2'>
                    <UploadField
                        label='Question Image'
                        value={questionAttrs?.image ?? ''}
                        onChange={(value) => updateQuestionAttr('image', value || undefined)}
                        uploadLabel='Upload Question Image'
                        onUpload={() => importQuizAsset('quiz-image', questionAttrs?.image)}
                        uploadDisabled={!questionAttrs?.image?.trim()}
                    />
                    <UploadField
                        label='Question Audio'
                        value={questionAttrs?.audio ?? ''}
                        onChange={(value) => updateQuestionAttr('audio', value || undefined)}
                        uploadLabel='Upload Question Audio'
                        onUpload={() => importQuizAsset('quiz-audio', questionAttrs?.audio)}
                        uploadDisabled={!questionAttrs?.audio?.trim()}
                    />
                </div>
                <RichTextEditor label='Question' value={getQuestionValue(page)} onChange={updateQuestionValue} />
            </EditorPanel>

            {(subtype === 'multipleChoiceSingle' || subtype === 'multipleChoiceMultiple') && (
                <>
                    <EditorPanel className='space-y-3 p-4'>
                        <div className='grid gap-3 md:grid-cols-2'>
                            <Toggle
                                label='Retry enabled'
                                checked={isChecked(subtype === 'multipleChoiceSingle' ? page.multipleChoiceSingle?.$?.retry : page.multipleChoiceMultiple?.$?.retry)}
                                onChange={(checked) =>
                                    replacePage({
                                        ...page,
                                        [subtype]: {
                                            ...(page[subtype] as NonNullable<Page['multipleChoiceSingle'] | Page['multipleChoiceMultiple']>),
                                            $: updateAttrs((page[subtype] as NonNullable<Page['multipleChoiceSingle'] | Page['multipleChoiceMultiple']>).$, 'retry', checked ? 'true' : 'false'),
                                        },
                                    })
                                }
                            />
                            <Toggle
                                label='Randomize answers'
                                checked={isChecked(subtype === 'multipleChoiceSingle' ? page.multipleChoiceSingle?.choices?.$?.random : page.multipleChoiceMultiple?.choices?.$?.random)}
                                onChange={(checked) =>
                                    replacePage({
                                        ...page,
                                        [subtype]: {
                                            ...(page[subtype] as NonNullable<Page['multipleChoiceSingle'] | Page['multipleChoiceMultiple']>),
                                            choices: {
                                                ...(page[subtype] as NonNullable<Page['multipleChoiceSingle'] | Page['multipleChoiceMultiple']>).choices,
                                                $: updateAttrs((page[subtype] as NonNullable<Page['multipleChoiceSingle'] | Page['multipleChoiceMultiple']>).choices.$, 'random', checked ? 'yes' : 'false'),
                                                answer: answers,
                                            },
                                        },
                                    })
                                }
                            />
                        </div>
                    </EditorPanel>

                    <EditorPanel className='space-y-3 p-4'>
                        <div className='flex items-center justify-between gap-3'>
                            <h3 className='text-base font-semibold'>Answers</h3>
                            <button
                                type='button'
                                className='btn btn-sm btn-outline'
                                onClick={() => {
                                    const nextAnswers = [...answers, createEmptyAnswer()];
                                    if (subtype === 'multipleChoiceSingle') {
                                        replacePage({
                                            ...page,
                                            multipleChoiceSingle: {
                                                ...page.multipleChoiceSingle!,
                                                choices: {
                                                    ...page.multipleChoiceSingle!.choices,
                                                    answer: nextAnswers,
                                                },
                                            },
                                        });
                                        return;
                                    }

                                    replacePage({
                                        ...page,
                                        multipleChoiceMultiple: {
                                            ...page.multipleChoiceMultiple!,
                                            choices: {
                                                ...page.multipleChoiceMultiple!.choices,
                                                answer: nextAnswers,
                                            },
                                        },
                                    });
                                }}>
                                Add Answer
                            </button>
                        </div>

                        {answers.map((answer, index) => (
                            <div key={index} className='space-y-3 rounded-box border border-base-300 bg-base-100 p-3'>
                                <div className='grid gap-3 md:grid-cols-2'>
                                    <Field
                                        label='Answer Text'
                                        value={answer.value ?? ''}
                                        onChange={(value) => {
                                            const nextAnswers = [...answers];
                                            nextAnswers[index] = { ...answer, value };
                                            if (subtype === 'multipleChoiceSingle') {
                                                replacePage({
                                                    ...page,
                                                    multipleChoiceSingle: {
                                                        ...page.multipleChoiceSingle!,
                                                        choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                    },
                                                });
                                                return;
                                            }

                                            replacePage({
                                                ...page,
                                                multipleChoiceMultiple: {
                                                    ...page.multipleChoiceMultiple!,
                                                    choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                                },
                                            });
                                        }}
                                    />
                                    <UploadField
                                        label='Answer Image'
                                        value={answer.$?.image ?? ''}
                                        uploadLabel='Upload Answer Image'
                                        onUpload={() => importQuizAsset('quiz-image', answer.$?.image)}
                                        uploadDisabled={!answer.$?.image?.trim()}
                                        onChange={(value) => {
                                            const nextAnswers = [...answers];
                                            nextAnswers[index] = { ...answer, $: updateAttrs(answer.$, 'image', value) };
                                            if (subtype === 'multipleChoiceSingle') {
                                                replacePage({
                                                    ...page,
                                                    multipleChoiceSingle: {
                                                        ...page.multipleChoiceSingle!,
                                                        choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                    },
                                                });
                                                return;
                                            }

                                            replacePage({
                                                ...page,
                                                multipleChoiceMultiple: {
                                                    ...page.multipleChoiceMultiple!,
                                                    choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                                },
                                            });
                                        }}
                                    />
                                </div>

                                <div className='grid gap-3 md:grid-cols-2'>
                                    <UploadField
                                        label='Answer Audio'
                                        value={answer.$?.audio ?? ''}
                                        uploadLabel='Upload Answer Audio'
                                        onUpload={() => importQuizAsset('quiz-audio', answer.$?.audio)}
                                        uploadDisabled={!answer.$?.audio?.trim()}
                                        onChange={(value) => {
                                            const nextAnswers = [...answers];
                                            nextAnswers[index] = { ...answer, $: updateAttrs(answer.$, 'audio', value) };
                                            if (subtype === 'multipleChoiceSingle') {
                                                replacePage({
                                                    ...page,
                                                    multipleChoiceSingle: {
                                                        ...page.multipleChoiceSingle!,
                                                        choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                    },
                                                });
                                                return;
                                            }

                                            replacePage({
                                                ...page,
                                                multipleChoiceMultiple: {
                                                    ...page.multipleChoiceMultiple!,
                                                    choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                                },
                                            });
                                        }}
                                    />
                                    <Toggle
                                        label='Correct answer'
                                        checked={answer.$?.correct === 'yes'}
                                        onChange={(checked) => {
                                            let nextAnswers = [...answers];
                                            if (subtype === 'multipleChoiceSingle' && checked) {
                                                nextAnswers = nextAnswers.map((item, answerIndex) => ({
                                                    ...item,
                                                    $: updateAttrs(item.$, 'correct', answerIndex === index ? 'yes' : undefined),
                                                }));
                                            } else {
                                                nextAnswers[index] = { ...answer, $: updateAttrs(answer.$, 'correct', checked ? 'yes' : undefined) };
                                            }

                                            if (subtype === 'multipleChoiceSingle') {
                                                replacePage({
                                                    ...page,
                                                    multipleChoiceSingle: {
                                                        ...page.multipleChoiceSingle!,
                                                        choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                    },
                                                });
                                                return;
                                            }

                                            replacePage({
                                                ...page,
                                                multipleChoiceMultiple: {
                                                    ...page.multipleChoiceMultiple!,
                                                    choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                                },
                                            });
                                        }}
                                    />
                                </div>

                                <RichTextEditor
                                    label='Answer Feedback'
                                    value={answer.feedback ?? ''}
                                    onChange={(value) => {
                                        const nextAnswers = [...answers];
                                        nextAnswers[index] = { ...answer, feedback: value };
                                        if (subtype === 'multipleChoiceSingle') {
                                            replacePage({
                                                ...page,
                                                multipleChoiceSingle: {
                                                    ...page.multipleChoiceSingle!,
                                                    choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                },
                                            });
                                            return;
                                        }

                                        replacePage({
                                            ...page,
                                            multipleChoiceMultiple: {
                                                ...page.multipleChoiceMultiple!,
                                                choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                            },
                                        });
                                    }}
                                    minHeightClassName='min-h-24'
                                />

                                <button
                                    type='button'
                                    className='btn btn-sm btn-error btn-outline'
                                    onClick={() => {
                                        const nextAnswers = answers.filter((_, answerIndex) => answerIndex !== index);
                                        if (subtype === 'multipleChoiceSingle') {
                                            replacePage({
                                                ...page,
                                                multipleChoiceSingle: {
                                                    ...page.multipleChoiceSingle!,
                                                    choices: { ...page.multipleChoiceSingle!.choices, answer: nextAnswers },
                                                },
                                            });
                                            return;
                                        }

                                        replacePage({
                                            ...page,
                                            multipleChoiceMultiple: {
                                                ...page.multipleChoiceMultiple!,
                                                choices: { ...page.multipleChoiceMultiple!.choices, answer: nextAnswers },
                                            },
                                        });
                                    }}>
                                    Remove Answer
                                </button>
                            </div>
                        ))}
                    </EditorPanel>
                </>
            )}

            {subtype === 'multipleChoiceMultiple' && (
                <EditorPanel>
                    <RichTextEditor
                        label='Correct Feedback'
                        value={page.multipleChoiceMultiple?.correctFeedback ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                multipleChoiceMultiple: {
                                    ...page.multipleChoiceMultiple!,
                                    correctFeedback: value,
                                },
                            })
                        }
                        minHeightClassName='min-h-24'
                    />
                    <RichTextEditor
                        label='Incorrect Feedback'
                        value={page.multipleChoiceMultiple?.incorrectFeedback ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                multipleChoiceMultiple: {
                                    ...page.multipleChoiceMultiple!,
                                    incorrectFeedback: value,
                                },
                            })
                        }
                        minHeightClassName='min-h-24'
                    />
                </EditorPanel>
            )}

            {subtype === 'shortAnswer' && (
                <EditorPanel>
                    <RichTextEditor
                        label='Feedback'
                        value={page.shortAnswer?.feedback ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                shortAnswer: {
                                    ...page.shortAnswer!,
                                    feedback: value,
                                },
                            })
                        }
                    />
                </EditorPanel>
            )}

            {subtype === 'fillInTheBlank' && (
                <EditorPanel>
                    <Field
                        label='Correct Answer'
                        value={page.fillInTheBlank?.answer ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                fillInTheBlank: {
                                    ...page.fillInTheBlank!,
                                    answer: value,
                                },
                            })
                        }
                    />
                    <RichTextEditor
                        label='Correct Feedback'
                        value={page.fillInTheBlank?.correctFeedback ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                fillInTheBlank: {
                                    ...page.fillInTheBlank!,
                                    correctFeedback: value,
                                },
                            })
                        }
                        minHeightClassName='min-h-24'
                    />
                    <RichTextEditor
                        label='Incorrect Feedback'
                        value={page.fillInTheBlank?.incorrectFeedback ?? ''}
                        onChange={(value) =>
                            replacePage({
                                ...page,
                                fillInTheBlank: {
                                    ...page.fillInTheBlank!,
                                    incorrectFeedback: value,
                                },
                            })
                        }
                        minHeightClassName='min-h-24'
                    />
                </EditorPanel>
            )}
        </div>
    );
}
