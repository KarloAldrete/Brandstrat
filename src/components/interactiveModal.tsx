'use client';
import { useState, useEffect } from 'react';
import { Modal, Progress, ModalContent, ModalBody, ModalHeader, Button } from '@nextui-org/react';

// import Profundidad from '@/components/pf';
// import Grupales from '@/components/gp';

import supabaseClient from '@/lib/supabase';

interface ModalInteractiveProps {
    isOpen: boolean;
    projectName: string;
    onModalData: (data: any) => void;
    tipoAnalisis: 'grupales' | 'profundidad';
}

interface Question {
    id: number;
    text: string;
}

export default function ModalInteractive({ isOpen, projectName, onModalData, tipoAnalisis }: ModalInteractiveProps) {
    const [visible, setVisible] = useState(isOpen);
    const [progress, setProgress] = useState(0);
    const [archivoActual, setArchivoActual] = useState("");
    let respuestas: { [key: string]: { name: string, respuesta: string, nombreArchivo?: string }[] } = {};
    const [hasError, setHasError] = useState(false);
    const [questions, setQuestions] = useState<Question[] | undefined>();

    const [modalText, setModalText] = useState("Analizando Información");
    const [showButton, setShowButton] = useState(false);

    const agregarRespuesta = (nombreArchivo: string, pregunta: string, nuevasRespuestas: { name: string, respuesta: string }[]) => {
        if (!respuestas[pregunta]) {
            respuestas[pregunta] = [];
        }

        nuevasRespuestas.forEach((nuevaRespuesta) => {
            respuestas[pregunta].push({ ...nuevaRespuesta, nombreArchivo });
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await supabaseClient
                .from('proyectos')
                .select('*')
                .eq('id', projectName)
                .single();

            if (error) {
                console.error('Error al obtener las preguntas:', error);
            } else if (data && data.questions) {
                const questionsObjects = data.questions.map((question: any, index: any) => ({
                    id: index,
                    text: question,
                }));

                setQuestions(questionsObjects);
            }
        };

        fetchData();
    }, [projectName]);

    useEffect(() => {
        if (isOpen && projectName) {
            setVisible(true);
            setProgress(10);
            setArchivoActual("Analizando Información");
            setModalText(`Analizando ${archivoActual}`);

            const fetchProjectNames = async () => {
                const { data, error } = await supabaseClient
                    .storage
                    .from(projectName)
                    .list()

                if (error || !data || data.length === 0) {
                    console.error('Error al obtener nombres de proyectos:', error);
                    setModalText('No hay archivos en el proyecto');
                    setShowButton(true);
                    setHasError(true);
                    onModalData('No hay archivos en el proyecto')
                } else {
                    const filteredData = data?.filter(archivo => archivo.name !== 'questions');
                    const totalFiles = filteredData?.length || 0;

                    if (totalFiles === 0) {
                        setModalText('No hay preguntas para leer');
                        setShowButton(true);
                        setHasError(true);
                        onModalData('No hay preguntas en el proyecto')
                    } else if (filteredData) {
                        for (let index = 0; index < filteredData.length; index++) {
                            const archivo = filteredData[index];
                            setArchivoActual(`Analizando ${archivo.name}`);
                            setModalText(`Analizando ${archivo.name}`);
                    
                            if (questions) {
                                for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
                                    const question = questions[questionIndex];
                    
                                    const funcionAnalisis = async (projectName: string, fileName: string, question: string) => {
                                        if (tipoAnalisis === 'grupales') {
                                            const response = await fetch('/api/grupales', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                    projectName: projectName,
                                                    fileName: fileName,
                                                    question: question,
                                                }),
                                            });
                    
                                            if (!response.ok) {
                                                throw new Error('Error en la solicitud HTTP');
                                            }
                    
                                            return await response.json();
                                        } else if (tipoAnalisis === 'profundidad') {
                                            const response = await fetch('/api/profundidad', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                    projectName: projectName,
                                                    fileName: fileName,
                                                    question: question,
                                                }),
                                            });
                    
                                            if (!response.ok) {
                                                throw new Error('Error en la solicitud HTTP');
                                            }
                    
                                            return await response.json();
                                        }
                                    };
                    
                                    if (funcionAnalisis) {
                                        await funcionAnalisis(projectName, archivo.name, question.text).then(respuestasRecibidas => {
                                            for (let pregunta in respuestasRecibidas) {
                                                agregarRespuesta(archivo.name, pregunta, respuestasRecibidas[pregunta]);
                                            }
                                            setProgress((index + 1) / totalFiles * 100);
                                        });
                                    } else {
                                        console.error('funcionAnalisis es undefined');
                                        setModalText('Error: funcionAnalisis es undefined');
                                        setShowButton(true);
                                        setHasError(true);
                                    }
                                }
                            }
                        }
                        onModalData(respuestas);
                        setModalText('Análisis completo')
                        setShowButton(true)
                        setVisible(false);
                    }
                }
            };

            fetchProjectNames();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, projectName, tipoAnalisis]);

    return (
        <Modal
            isOpen={visible}
            onOpenChange={() => {
                setVisible(false);
                setHasError(false);
                setShowButton(false);
                setProgress(0);
            }}
            className="w-full h-auto max-w-[464px] max-h-[600px] rounded-lg"
            isDismissable={false}
            aria-label="Nombre de tu modal"
        >
            <ModalContent aria-label="Nombre de tu modal" className="w-full h-auto">

                <ModalHeader aria-label="Nombre de tu modal">
                    <h2 className='text-[#1F1F21]'>{modalText}</h2>
                </ModalHeader >

                <ModalBody className="w-full h-full flex flex-col items-center justify-center gap-6 p-3" aria-label="Nombre de tu modal">
                    {!hasError && progress < 100 ? <Progress aria-label="Nombre de tu modal" value={progress} color="success" /> : null}
                    {showButton ? <Button className='w-full rounded text-sm font-semibold bg-[#1F1F21] text-white' onClick={() => setVisible(false)}>{hasError ? 'Volver' : 'Visualizar Tabla'}</Button> : null}
                </ModalBody>


            </ModalContent>
        </Modal>
    );
}