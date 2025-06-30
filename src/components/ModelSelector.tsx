import React, { ChangeEvent } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

interface ModelOption {
    id: string;
    name: string;
    description: string;
    isEnglishOnly: boolean;
    size: 'tiny' | 'small' | 'base' | 'medium' | 'large' | 'large-v2';
    isBeta?: boolean;
}

const modelOptions: ModelOption[] = [
    {
        id: 'Xenova/whisper-tiny.en',
        name: 'Tiny (English)',
        description: 'Fast, lightweight model optimized for English transcription',
        isEnglishOnly: true,
        size: 'tiny'
    },
    {
        id: 'Xenova/whisper-tiny',
        name: 'Tiny (Multilingual)',
        description: 'Fast, lightweight model supporting multiple languages',
        isEnglishOnly: false,
        size: 'tiny'
    },
    {
        id: 'Xenova/whisper-small.en',
        name: 'Small (English)',
        description: 'Balanced performance for English transcription',
        isEnglishOnly: true,
        size: 'small'
    },
    {
        id: 'Xenova/whisper-small',
        name: 'Small (Multilingual)',
        description: 'Balanced performance supporting multiple languages',
        isEnglishOnly: false,
        size: 'small'
    },
    {
        id: 'Xenova/whisper-base.en',
        name: 'Base (English)',
        description: 'Standard model for English transcription',
        isEnglishOnly: true,
        size: 'base'
    },
    {
        id: 'Xenova/whisper-base',
        name: 'Base (Multilingual)',
        description: 'Standard model supporting multiple languages',
        isEnglishOnly: false,
        size: 'base'
    },
    {
        id: 'Xenova/whisper-medium.en',
        name: 'Medium (English)',
        description: 'High accuracy for English transcription',
        isEnglishOnly: true,
        size: 'medium'
    },
    {
        id: 'Xenova/whisper-large',
        name: 'Large',
        description: 'Highest accuracy for multilingual transcription',
        isEnglishOnly: false,
        size: 'large'
    },
    {
        id: 'Xenova/whisper-large-v2',
        name: 'Large V2',
        description: 'Latest version with improved accuracy',
        isEnglishOnly: false,
        size: 'large-v2'
    },
    {
        id: 'Xenova/nb-whisper-tiny-beta',
        name: 'Tiny Beta',
        description: 'Experimental tiny model with new features',
        isEnglishOnly: false,
        size: 'tiny',
        isBeta: true
    },
    {
        id: 'Xenova/nb-whisper-small-beta',
        name: 'Small Beta',
        description: 'Experimental small model with new features',
        isEnglishOnly: false,
        size: 'small',
        isBeta: true
    },
    {
        id: 'Xenova/nb-whisper-base-beta',
        name: 'Base Beta',
        description: 'Experimental base model with new features',
        isEnglishOnly: false,
        size: 'base',
        isBeta: true
    },
    {
        id: 'Xenova/nb-whisper-medium-beta',
        name: 'Medium Beta',
        description: 'Experimental medium model with new features',
        isEnglishOnly: false,
        size: 'medium',
        isBeta: true
    }
];

interface Props {
    transcriber?: any; // Optional for backward compatibility
    className?: string;
}

export function ModelSelector({ className = '' }: Props): React.ReactElement {
    const { model, multilingual, setModel, setMultilingual } = useSettingsStore();

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const selectedModel = e.target.value;
        setModel(selectedModel);
        
        // Update multilingual setting based on model selection
        const isEnglishOnly = selectedModel.endsWith('.en');
        setMultilingual(!isEnglishOnly);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="space-y-2">
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-300">
                    Transcription Model
                </label>
                <select
                    id="model-select"
                    value={model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    {modelOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name} {option.isBeta ? '(Beta)' : ''}
                        </option>
                    ))}
                </select>
                <p className="text-sm text-gray-400">
                    {modelOptions.find(m => m.id === model)?.description || 'Select a model for transcription'}
                </p>
            </div>
            
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                    Language Detection
                </label>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={multilingual}
                        onChange={(e) => setMultilingual(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">
                        {multilingual ? 'Auto-detect language' : 'English only'}
                    </span>
                </div>
                <p className="text-sm text-gray-400">
                    {multilingual 
                        ? 'Automatically detect and transcribe multiple languages'
                        : 'Optimized for English transcription only'
                    }
                </p>
            </div>
        </div>
    );
}