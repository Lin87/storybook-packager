'use client';

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

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <input className='input input-md w-full' type={type} value={value} placeholder={label} onChange={(event) => onChange(event.target.value)} />
        </label>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className='label cursor-pointer justify-start gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3'>
            <input type='checkbox' className='checkbox checkbox-sm' checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className='label-text'>{label}</span>
        </label>
    );
}

function isChecked(value: string | undefined) {
    return value === 'true' || value === 'yes' || value === 'on';
}

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
            <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                    <label className='form-control gap-2'>
                        <span className='label-text'>Page Type</span>
                        <select
                            className='select select-bordered'
                            value='quiz'
                            onChange={(event) =>
                                dispatch({
                                    type: 'changePageType',
                                    payload: {
                                        sectionIndex,
                                        pageIndex,
                                        pageType: event.target.value as SupportedPageType,
                                    },
                                })
                            }>
                            {PAGE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {PAGE_TYPE_LABELS[type]}
                                </option>
                            ))}
                        </select>
                    </label>

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

                <label className='form-control gap-2'>
                    <span className='label-text'>Quiz Type</span>
                    <select
                        className='select select-bordered'
                        value={subtype}
                        onChange={(event) =>
                            dispatch({
                                type: 'changeQuizSubtype',
                                payload: {
                                    sectionIndex,
                                    pageIndex,
                                    quizSubtype: event.target.value as QuizSubtype,
                                },
                            })
                        }>
                        {QUIZ_SUBTYPES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
            </section>

            <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Field label='Question Image' value={questionAttrs?.image ?? ''} onChange={(value) => updateQuestionAttr('image', value || undefined)} />
                        <button type='button' className='btn btn-sm btn-outline' onClick={() => importQuizAsset('quiz-image', questionAttrs?.image)} disabled={!questionAttrs?.image?.trim()}>
                            Upload Question Image
                        </button>
                    </div>
                    <div className='space-y-2'>
                        <Field label='Question Audio' value={questionAttrs?.audio ?? ''} onChange={(value) => updateQuestionAttr('audio', value || undefined)} />
                        <button type='button' className='btn btn-sm btn-outline' onClick={() => importQuizAsset('quiz-audio', questionAttrs?.audio)} disabled={!questionAttrs?.audio?.trim()}>
                            Upload Question Audio
                        </button>
                    </div>
                </div>
                <RichTextEditor label='Question' value={getQuestionValue(page)} onChange={updateQuestionValue} />
            </section>

            {(subtype === 'multipleChoiceSingle' || subtype === 'multipleChoiceMultiple') && (
                <>
                    <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
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
                    </section>

                    <section className='space-y-3 rounded-box border border-base-300 bg-base-200 p-4'>
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
                                    <Field
                                        label='Answer Image'
                                        value={answer.$?.image ?? ''}
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
                                    <button type='button' className='btn btn-sm btn-outline' onClick={() => importQuizAsset('quiz-image', answer.$?.image)} disabled={!answer.$?.image?.trim()}>
                                        Upload Answer Image
                                    </button>
                                </div>

                                <div className='grid gap-3 md:grid-cols-2'>
                                    <div className='space-y-2'>
                                        <Field
                                            label='Answer Audio'
                                            value={answer.$?.audio ?? ''}
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
                                        <button type='button' className='btn btn-sm btn-outline' onClick={() => importQuizAsset('quiz-audio', answer.$?.audio)} disabled={!answer.$?.audio?.trim()}>
                                            Upload Answer Audio
                                        </button>
                                    </div>
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
                    </section>
                </>
            )}

            {subtype === 'multipleChoiceMultiple' && (
                <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
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
                </section>
            )}

            {subtype === 'shortAnswer' && (
                <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
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
                </section>
            )}

            {subtype === 'fillInTheBlank' && (
                <section className='space-y-4 rounded-box border border-base-300 bg-base-200 p-4'>
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
                </section>
            )}
        </div>
    );
}
