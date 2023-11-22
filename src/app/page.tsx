'use client';
import React, { useEffect, useState } from 'react';
import NavigationBar from '@/modules/navbar';
import { Modal, DropdownItem, ModalContent, Tooltip, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure, Input, Divider, AvatarGroup, Avatar, Progress, Textarea, RadioGroup, Radio, useRadio, VisuallyHidden, RadioProps, cn, Dropdown, DropdownTrigger, DropdownMenu, ScrollShadow } from "@nextui-org/react";
import CheckSession from '@/lib/checkSession';
import { useRouter } from 'next/navigation';
import supabaseClient from '@/lib/supabase';

import { IconLayoutGridAdd, IconProgressBolt, IconPlayerPause, IconDiscountCheck, IconDotsVertical, IconUser, IconBookOff, IconFileTypePdf, IconUsersGroup, IconColumns } from '@tabler/icons-react';

import { CustomRadio } from '@/components/CustomRadio';

interface Project {
  id: string;
  name: string;
  description: string;
  files: Array<any>,
  users: {
    user: User;
  };
  status: string;
  type: string;
  tableData: Record<string, any[]>;
};

interface User {
  img: string;
  name: string;
};

export default function Home() {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [projectDescription, setProjectDescription] = useState('');
  const [type, setType] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUserSession = async () => {
      const session = await CheckSession();
      if (session.session == null) {
        console.log("El usuario no está logueado");
        router.push('/auth')
      } else {
        setUser(session.userData);
      }
    };
    checkUserSession();
  }, [router]);

  useEffect(() => {
    fetchProjects()
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabaseClient
      .from('proyectos')
      .select('*')
    console.log(data)

    if (error) {
      console.error('Error al obtener proyectos:', error)
    } else {
      setProjects(data)
    }
  };

  const handleSubmitProject = async () => {
    const { data, error } = await supabaseClient
      .from('proyectos')
      .insert([
        { description: projectDescription, users: { user }, type: type },
      ])

    if (error) {
      console.error('Error al insertar datos:', error)
    } else {
      console.log('Datos insertados:', data)
      onOpenChange()
      location.reload()
    }
  };

  const handleProcess = (projectId: string) => {
    console.log(projectId);
  };

  const handleDelete = async (projectId: string) => {

    const { data, error } = await supabaseClient
      .from('proyectos')
      .delete()
      .eq('id', projectId)

    if (!error) {
      location.reload();
    }

  };

  return (

    <main className='w-screen h-screen flex flex-col items-center justify-start'>

      <NavigationBar />

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="top-center"
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
        }}
        className='border-1 border-[#89898A] min-w-[600px] flex flex-col items-center justify-start gap-6 rounded-lg p-4'
      >
        <ModalContent className='flex flex-col gap-4 w-full'>
          {(onClose) => (
            <>
              <ModalHeader className="w-full p-0 font-bold text-lg text-[#1F1F21] ">Nuevo proyecto</ModalHeader>
              <ModalBody className='w-full p-0'>
                <div className='w-full'>
                  <Textarea
                    labelPlacement="outside"
                    variant='bordered'
                    label="Descripcion"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>
                <div className='w-full flex flex-row'>
                  <RadioGroup
                    style={{ width: '100%', display: 'flex' }}
                    onChange={(e) => {
                      console.log(e.target.value);
                      setType(e.target.value);
                    }}
                  >
                    <div className='w-full flex flex-row gap-2'>
                      <CustomRadio description="Documentos por persona" value="Profundidad" style={{ padding: '4px 8px', width: '100%' }} >
                        Entrevistas en Profundidad
                      </CustomRadio>
                      <CustomRadio description="Documentos por grupos" value="Grupal" style={{ padding: '4px 8px', width: '100%' }}>
                        Entrevistas Grupales
                      </CustomRadio>
                    </div>
                  </RadioGroup>
                </div>
              </ModalBody>
              <ModalFooter className='p-0 w-full min-h-[36px]'>
                <Button className='bg-[#1F1F21] rounded-md w-full min-h-[36px] text-white font-semibold text-base' onPress={handleSubmitProject}>
                  Crear
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <div className='w-full max-w-7xl h-full pt-6 flex flex-col gap-8'>

        <div className='w-full h-14 flex flex-row items-end justify-between cursor-default'>

          <div className='w-auto h-full flex flex-col gap-0'>

            <span className=' text-base font-normal text-[#A1A1A1]'>Bienvenido de vuelta {user?.name}</span>

            <h4 className=' text-2xl font-bold text-[#1F1F21]'>Administrador de proyectos</h4>

          </div>

          <Button className='w-auto h-8 px-3 bg-white text-base font-bold text-[#1F1F21] rounded-md border-2 border-[#1F1F21] hover:bg-[#1F1F21] hover:text-[#E7E7E8]' onClick={onOpen}>Añadir proyecto</Button>

        </div>

        <div className='w-full h-full grid grid-cols-4 gap-5'>

          <div className='w-full flex flex-col items-start justify-start gap-2'>

            <div className='w-full max-h-9 h-full flex flex-row items-center justify-start gap-2 cursor-default p-2'>

              <IconLayoutGridAdd size={20} className='text-[#1F1F21]' />

              <span className=' text-base font-bold text-[#1F1F21]'>Nuevos</span>

            </div>

            <ScrollShadow hideScrollBar className='w-full flex flex-col gap-2' style={{ maxHeight: 'calc(100vh - 256px)' }}>

              {projects.filter(project => project.status === 'new').map((project, index) => (

                <div key={index} className='w-full h-auto flex flex-col items-start justify-start gap-2'>

                  <div className='w-full border-x-1 border-t-1 border-b-2 border-[#89898A] flex flex-col items-start justify-start p-4 gap-4 rounded-lg bg-white'>

                    <div className='w-full flex flex-col items-center justify-start gap-2 cursor-default'>

                      <div className='w-full h-[18px] flex flex-row items-center justify-between'>

                        <div className='w-auto h-full flex flex-row gap-1 cursor-default'>

                          {project.type === 'Grupal' ? <IconUsersGroup size={18} className='text-[#89898A] stroke-[3]' /> : <IconUser size={18} className='text-[#89898A] stroke-[3]' />}

                          <span className=' text-sm font-semibold text-[#89898A]'>{project.type}</span>

                        </div>

                        <Dropdown aria-label='dropdown' className='rounded' backdrop='blur' classNames={{
                          base: "before:bg-default-200",
                          content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                        }}>
                          <DropdownTrigger>
                            <IconDotsVertical size={18} className='text-[#89898A] cursor-pointer hover:text-[#1F1F21]' />
                          </DropdownTrigger>
                          <DropdownMenu aria-label='menu'>
                            <DropdownItem aria-label='see' key='See' onClick={() => router.push(`proyecto/${project.id}`)}>Acceder</DropdownItem>
                            <DropdownItem aria-label='move' key='process' startContent={<IconProgressBolt />} onClick={() => handleProcess(project.id)}>En Proceso</DropdownItem>
                            <DropdownItem aria-label='move' key='pause' startContent={<IconPlayerPause />} onClick={() => handleProcess(project.id)}>En Pausa</DropdownItem>
                            <DropdownItem aria-label='move' key='finish' startContent={<IconDiscountCheck />} onClick={() => handleProcess(project.id)}>Finalizado</DropdownItem>
                            <DropdownItem aria-label='delete' key='Delete' onClick={() => handleDelete(project.id)}>Eliminar</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>

                      </div>

                      <div className='w-full h-auto'>

                        <span className='descriptions' style={{ display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</span>

                      </div>

                    </div>

                    <Divider className='h-[1px] bg-[#89898A]'></Divider>

                    <div className='w-full h-8 flex flex-row items-end justify-between'>

                      <div className='w-auto h-full'>

                        <AvatarGroup isBordered max={3} renderCount={(count) => (
                          <p className="text-small font-medium ms-2 text-[#89898A]">+{count}</p>
                        )}>

                          <Tooltip content={project.users.user.name} placement='left'>
                            <Avatar src={project.users.user.img} size='sm' name={project.users.user.name} />
                          </Tooltip>

                        </AvatarGroup>

                      </div>

                      <div className='w-auto h-auto'>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {project.files?.length > 0 ? <IconFileTypePdf size={24} className='text-[#1F1F21]' /> : <IconBookOff size={24} className='text-[#1F1F21]' />}

                          {project.files?.length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>{project.files.length} Docs</span>}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </ScrollShadow>

          </div>

          <div className='flex flex-col items-start justify-start gap-2'>

            <div className='w-full min-h-9 max-h-9 flex flex-row items-center justify-start gap-2 cursor-default p-2'>

              <IconProgressBolt size={20} className='text-[#1F1F21]' />

              <span className=' text-base font-bold text-[#1F1F21]'>En Proceso</span>

            </div>

            <ScrollShadow hideScrollBar className='w-full flex flex-col gap-2' style={{ maxHeight: 'calc(100vh - 256px)' }}>

              {projects.filter(project => project.status === 'process').map((project, index) => (

                <div key={index} className='w-full h-auto flex flex-col items-start justify-start gap-2'>

                  <div className='w-full border-x-1 border-t-1 border-b-2 border-[#89898A] flex flex-col items-start justify-start p-4 gap-4 rounded-lg bg-white'>

                    <div className='w-full flex flex-col items-center justify-start gap-2 cursor-default'>

                      <div className='w-full h-[18px] flex flex-row items-center justify-between'>

                        <div className='w-auto h-full flex flex-row gap-1 cursor-default'>

                          {project.type === 'Grupal' ? <IconUsersGroup size={18} className='text-[#89898A] stroke-[3]' /> : <IconUser size={18} className='text-[#89898A] stroke-[3]' />}

                          <span className=' text-sm font-semibold text-[#89898A]'>{project.type}</span>

                        </div>

                        <Dropdown aria-label='dropdown' className='rounded' backdrop='blur' classNames={{
                          base: "before:bg-default-200",
                          content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                        }}>
                          <DropdownTrigger>
                            <IconDotsVertical size={18} className='text-[#89898A] cursor-pointer hover:text-[#1F1F21]' />
                          </DropdownTrigger>
                          <DropdownMenu aria-label='menu'>
                            <DropdownItem aria-label='see' key='See' onClick={() => router.push(`proyecto/${project.id}`)}>Acceder</DropdownItem>
                            <DropdownItem aria-label='move' key='pause' startContent={<IconPlayerPause />} onClick={() => handleProcess(project.id)}>En Pausa</DropdownItem>
                            <DropdownItem aria-label='move' key='finish' startContent={<IconDiscountCheck />} onClick={() => handleProcess(project.id)}>Finalizado</DropdownItem>
                            <DropdownItem aria-label='delete' key='Delete' onClick={() => handleDelete(project.id)}>Eliminar</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>

                      </div>

                      <div className='w-full h-auto'>

                        <span className='descriptions' style={{ display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</span>

                      </div>

                    </div>

                    <Divider className='h-[1px] bg-[#89898A]'></Divider>

                    <div className='w-full h-8 flex flex-row items-end justify-between'>

                      <div className='w-auto h-full'>

                        <AvatarGroup isBordered max={3} renderCount={(count) => (
                          <p className="text-small font-medium ms-2 text-[#89898A]">+{count}</p>
                        )}>

                          <Tooltip content={project.users.user.name} placement='left'>
                            <Avatar src={project.users.user.img} size='sm' name={project.users.user.name} />
                          </Tooltip>

                        </AvatarGroup>

                      </div>

                      <div className='w-auto h-auto flex flex-row items-center justify-end gap-2'>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {project.files?.length > 0 ? <IconFileTypePdf size={24} className='text-[#1F1F21]' /> : <IconBookOff size={24} className='text-[#1F1F21]' />}

                          {project.files?.length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>{project.files.length} Docs</span>}

                        </div>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {Object.keys(project.tableData).length > 0 ? <IconColumns size={24} className='text-[#1F1F21]' /> : null}
                          {Object.keys(project.tableData).length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>Tabla</span>}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </ScrollShadow>

          </div>

          <div className='flex flex-col items-start justify-start gap-2'>

            <div className='w-full min-h-9 max-h-9 flex flex-row items-center justify-start gap-2 cursor-default p-2'>

              <IconPlayerPause size={20} className='text-[#1F1F21]' />

              <span className=' text-base font-bold text-[#1F1F21]'>Pausados</span>

            </div>

            <ScrollShadow hideScrollBar className='w-full flex flex-col gap-2' style={{ maxHeight: 'calc(100vh - 256px)' }}>

              {projects.filter(project => project.status === 'paused').map((project, index) => (

                <div key={index} className='w-full h-auto flex flex-col items-start justify-start gap-2'>

                  <div className='w-full border-x-1 border-t-1 border-b-2 border-[#89898A] flex flex-col items-start justify-start p-4 gap-4 rounded-lg bg-white'>

                    <div className='w-full flex flex-col items-center justify-start gap-2 cursor-default'>

                      <div className='w-full h-[18px] flex flex-row items-center justify-between'>

                        <div className='w-auto h-full flex flex-row gap-1 cursor-default'>

                          {project.type === 'Grupal' ? <IconUsersGroup size={18} className='text-[#89898A] stroke-[3]' /> : <IconUser size={18} className='text-[#89898A] stroke-[3]' />}

                          <span className=' text-sm font-semibold text-[#89898A]'>{project.type}</span>

                        </div>

                        <Dropdown aria-label='dropdown' className='rounded' backdrop='blur' classNames={{
                          base: "before:bg-default-200",
                          content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                        }}>
                          <DropdownTrigger>
                            <IconDotsVertical size={18} className='text-[#89898A] cursor-pointer hover:text-[#1F1F21]' />
                          </DropdownTrigger>
                          <DropdownMenu aria-label='menu'>
                            <DropdownItem aria-label='see' key='See' onClick={() => router.push(`proyecto/${project.id}`)}>Acceder</DropdownItem>
                            <DropdownItem aria-label='move' key='pause' startContent={<IconPlayerPause />} onClick={() => handleProcess(project.id)}>En Pausa</DropdownItem>
                            <DropdownItem aria-label='move' key='finish' startContent={<IconDiscountCheck />} onClick={() => handleProcess(project.id)}>Finalizado</DropdownItem>
                            <DropdownItem aria-label='delete' key='Delete' onClick={() => handleDelete(project.id)}>Eliminar</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>

                      </div>

                      <div className='w-full h-auto'>

                        <span className='descriptions' style={{ display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</span>

                      </div>

                    </div>

                    <Divider className='h-[1px] bg-[#89898A]'></Divider>

                    <div className='w-full h-8 flex flex-row items-end justify-between'>

                      <div className='w-auto h-full'>

                        <AvatarGroup isBordered max={3} renderCount={(count) => (
                          <p className="text-small font-medium ms-2 text-[#89898A]">+{count}</p>
                        )}>

                          <Tooltip content={project.users.user.name} placement='left'>
                            <Avatar src={project.users.user.img} size='sm' name={project.users.user.name} />
                          </Tooltip>

                        </AvatarGroup>

                      </div>

                      <div className='w-auto h-auto flex flex-row items-center justify-end gap-2'>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {project.files?.length > 0 ? <IconFileTypePdf size={24} className='text-[#1F1F21]' /> : <IconBookOff size={24} className='text-[#1F1F21]' />}

                          {project.files?.length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>{project.files.length} Docs</span>}

                        </div>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {Object.keys(project.tableData).length > 0 ? <IconColumns size={24} className='text-[#1F1F21]' /> : null}
                          {Object.keys(project.tableData).length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>Tabla</span>}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </ScrollShadow>

          </div>

          <div className='flex flex-col items-start justify-start gap-2'>

            <div className='w-full min-h-9 max-h-9 flex flex-row items-center justify-start gap-2 cursor-default p-2'>

              <IconDiscountCheck size={20} className='text-[#1F1F21]' />

              <span className=' text-base font-bold text-[#1F1F21]'>Finalizados</span>

            </div>

            <ScrollShadow hideScrollBar className='w-full flex flex-col gap-2' style={{ maxHeight: 'calc(100vh - 256px)' }}>

              {projects.filter(project => project.status === 'finished').map((project, index) => (

                <div key={index} className='w-full h-auto flex flex-col items-start justify-start gap-2'>

                  <div className='w-full border-x-1 border-t-1 border-b-2 border-[#89898A] flex flex-col items-start justify-start p-4 gap-4 rounded-lg bg-white'>

                    <div className='w-full flex flex-col items-center justify-start gap-2 cursor-default'>

                      <div className='w-full h-[18px] flex flex-row items-center justify-between'>

                        <div className='w-auto h-full flex flex-row gap-1 cursor-default'>

                          {project.type === 'Grupal' ? <IconUsersGroup size={18} className='text-[#89898A] stroke-[3]' /> : <IconUser size={18} className='text-[#89898A] stroke-[3]' />}

                          <span className=' text-sm font-semibold text-[#89898A]'>{project.type}</span>

                        </div>

                        <Dropdown aria-label='dropdown' className='rounded' backdrop='blur' classNames={{
                          base: "before:bg-default-200",
                          content: "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
                        }}>
                          <DropdownTrigger>
                            <IconDotsVertical size={18} className='text-[#89898A] cursor-pointer hover:text-[#1F1F21]' />
                          </DropdownTrigger>
                          <DropdownMenu aria-label='menu'>
                            <DropdownItem aria-label='see' key='See' onClick={() => router.push(`proyecto/${project.id}`)}>Acceder</DropdownItem>
                            <DropdownItem aria-label='move' key='pause' startContent={<IconPlayerPause />} onClick={() => handleProcess(project.id)}>En Pausa</DropdownItem>
                            <DropdownItem aria-label='move' key='finish' startContent={<IconDiscountCheck />} onClick={() => handleProcess(project.id)}>Finalizado</DropdownItem>
                            <DropdownItem aria-label='delete' key='Delete' onClick={() => handleDelete(project.id)}>Eliminar</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>

                      </div>

                      <div className='w-full h-auto'>

                        <span className='descriptions' style={{ display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</span>

                      </div>

                    </div>

                    <Divider className='h-[1px] bg-[#89898A]'></Divider>

                    <div className='w-full h-8 flex flex-row items-end justify-between'>

                      <div className='w-auto h-full'>

                        <AvatarGroup isBordered max={3} renderCount={(count) => (
                          <p className="text-small font-medium ms-2 text-[#89898A]">+{count}</p>
                        )}>

                          <Tooltip content={project.users.user.name} placement='left'>
                            <Avatar src={project.users.user.img} size='sm' name={project.users.user.name} />
                          </Tooltip>

                        </AvatarGroup>

                      </div>

                      <div className='w-auto h-auto flex flex-row items-center justify-end gap-2'>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {project.files?.length > 0 ? <IconFileTypePdf size={24} className='text-[#1F1F21]' /> : <IconBookOff size={24} className='text-[#1F1F21]' />}

                          {project.files?.length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>{project.files.length} Docs</span>}

                        </div>

                        <div className='w-auto h-auto flex flex-row gap-1 items-center justify-end'>

                          {Object.keys(project.tableData).length > 0 ? <IconColumns size={24} className='text-[#1F1F21]' /> : null}
                          {Object.keys(project.tableData).length > 0 && <span className='text-sm font-bold text-[#1F1F21]'>Tabla</span>}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </ScrollShadow>

          </div>

        </div>

      </div>

    </main>

  )
}
