'use client';
import { useMemo, useState, useCallback, Key, ChangeEvent, useEffect } from 'react';
import NavigationBar from '@/modules/navbar';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Button,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    Chip,
    User,
    Pagination,
    Selection,
    ChipProps,
    SortDescriptor,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Checkbox, Link, Select, SelectItem, RadioGroup
} from "@nextui-org/react";
import { toast } from 'sonner';
import { columns, statusOptions } from "./data";
import { capitalize } from "./utils";
import supabaseClient from '@/lib/supabase';

import { IconPlus, IconDotsVertical, IconChevronDown, IconSearch } from '@tabler/icons-react';
import { CustomRadio } from '@/components/CustomRadio';

const statusColorMap: Record<string, ChipProps["color"]> = {
    activo: "success",
    restringido: "danger",
    vacaciones: "warning",
};

const INITIAL_VISIBLE_COLUMNS = ["name", "email", "status", "actions"];

type User = {
    id: number;
    name: string;
    email: string;
    avatar: string;
    role: string;
    status: string;
};


export default function Dashboard() {
    const [filterValue, setFilterValue] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [statusFilter, setStatusFilter] = useState<Selection>("all");
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [users, setUsers] = useState<User[]>([]);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState("");
    const [newUserName, setNewUserName] = useState("");
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "age",
        direction: "ascending",
    });
    const [page, setPage] = useState(1);

    const pages = Math.ceil(users.length / rowsPerPage);

    const hasSearchFilter = Boolean(filterValue);

    const headerColumns = useMemo(() => {
        if (visibleColumns === "all") return columns;

        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    const filteredItems = useMemo(() => {
        let filteredUsers = [...users];

        if (hasSearchFilter) {
            filteredUsers = filteredUsers.filter((user) =>
                user.name.toLowerCase().includes(filterValue.toLowerCase()),
            );
        }
        if (statusFilter !== "all" && Array.from(statusFilter).length !== statusOptions.length) {
            filteredUsers = filteredUsers.filter((user) =>
                Array.from(statusFilter).includes(user.status),
            );
        }

        return filteredUsers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users, filterValue, statusFilter]);

    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = useMemo(() => {
        return [...items].sort((a: User, b: User) => {
            const first = a[sortDescriptor.column as keyof User] as number;
            const second = b[sortDescriptor.column as keyof User] as number;
            const cmp = first < second ? -1 : first > second ? 1 : 0;

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const renderCell = useCallback((user: User, columnKey: Key) => {
        const cellValue = user[columnKey as keyof User];

        switch (columnKey) {
            case "name":
                return (
                    <User
                        avatarProps={{ radius: "full", size: "sm", src: user.avatar }}
                        classNames={{
                            description: "text-default-500",
                        }}
                        // description={user.email}
                        name={cellValue}
                    >
                        {user.email}
                    </User>
                );
            case "role":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-small capitalize">{cellValue}</p>
                    </div>
                );
            case "status":
                return (
                    <Chip
                        className="capitalize border-none gap-1 text-default-600"
                        color={statusColorMap[user.status]}
                        size="sm"
                        variant="dot"
                    >
                        {cellValue}
                    </Chip>
                );
            case "actions":
                return (
                    <div className="relative flex justify-end items-center gap-2">
                        <Dropdown className="bg-background border-1 border-default-200" aria-label='...'>
                            <DropdownTrigger>
                                <Button isIconOnly radius="full" size="sm" variant="light">
                                    <IconDotsVertical className="text-default-400" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label='...'>
                                <DropdownItem aria-label='...'>Editar</DropdownItem>
                                <DropdownItem aria-label='...' onClick={() => handleDeleteUser(user.id.toString())}>Eliminar</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return cellValue;
        }
    }, []);

    const onRowsPerPageChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(Number(e.target.value));
        setPage(1);
    }, []);

    const onSearchChange = useCallback((value?: string) => {
        if (value) {
            setFilterValue(value);
            setPage(1);
        } else {
            setFilterValue("");
        }
    }, []);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between gap-3 items-end">
                    <Input
                        isClearable
                        classNames={{
                            base: "w-full sm:max-w-[44%]",
                            inputWrapper: "border-1",
                        }}
                        placeholder="Buscar usuario..."
                        size="sm"
                        startContent={<IconSearch className="text-default-300" />}
                        value={filterValue}
                        variant="bordered"
                        onClear={() => setFilterValue("")}
                        onValueChange={onSearchChange}
                    />
                    <div className="flex gap-3">
                        <Dropdown>
                            <DropdownTrigger className="hidden sm:flex">
                                <Button
                                    endContent={<IconChevronDown className="text-small" />}
                                    size="sm"
                                    variant="flat"
                                >
                                    Estado
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={statusFilter}
                                selectionMode="multiple"
                                onSelectionChange={setStatusFilter}
                            >
                                {statusOptions.map((status) => (
                                    <DropdownItem key={status.uid} className="capitalize">
                                        {capitalize(status.name)}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <Dropdown>
                            <DropdownTrigger className="hidden sm:flex">
                                <Button
                                    endContent={<IconChevronDown className="text-small" />}
                                    size="sm"
                                    variant="flat"
                                >
                                    Filtros
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={visibleColumns}
                                selectionMode="multiple"
                                onSelectionChange={setVisibleColumns}
                            >
                                {columns.map((column) => (
                                    <DropdownItem key={column.uid} className="capitalize">
                                        {capitalize(column.name)}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <Button
                            className="bg-foreground text-background"
                            endContent={<IconPlus />}
                            size="sm"
                            onClick={onOpen}
                        >
                            Crear Usuario
                        </Button>
                    </div>
                </div>
            </div>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filterValue,
        statusFilter,
        visibleColumns,
        onSearchChange,
        onRowsPerPageChange,
        users.length,
        hasSearchFilter,
    ]);

    const bottomContent = useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <Pagination
                    showControls
                    classNames={{
                        cursor: "bg-foreground text-background",
                    }}
                    color="default"
                    isDisabled={hasSearchFilter}
                    page={page}
                    total={pages}
                    variant="light"
                    onChange={setPage}
                />
                <span className="text-small text-default-400">
                    {selectedKeys === "all"
                        ? "Todos los usuarios seleccionados"
                        : `${selectedKeys.size} de ${items.length} seleccionados`}
                </span>
            </div>
        );
    }, [selectedKeys, items.length, page, pages, hasSearchFilter]);

    const classNames = useMemo(
        () => ({
            wrapper: ["max-h-[382px]", "max-w-3xl"],
            th: ["bg-transparent", "text-default-500", "border-b", "border-divider"],
            td: [
                // changing the rows border radius
                // first
                "group-data-[first=true]:first:before:rounded-none",
                "group-data-[first=true]:last:before:rounded-none",
                // middle
                "group-data-[middle=true]:before:rounded-none",
                // last
                "group-data-[last=true]:first:before:rounded-none",
                "group-data-[last=true]:last:before:rounded-none",
            ],
        }),
        [],
    );

    useEffect(() => {
        const getUsers = async () => {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
            if (data) {
                setUsers(data);
            }
        }
        getUsers();
    }, []);

    const handleSignUp = async () => {
        const { data, error } = await supabaseClient.auth.signUp({
            email: newUserEmail,
            password: newUserPassword,
            options: {
                data: {
                    name: newUserName,
                    role: newUserRole,
                },
            },
        });
        if (!error) {
            toast.success('Usuario creado correctamente');
            toast(
                'Se reiniciará la ventana para cargar al usuario',
                {
                    duration: 5000,
                }
            );
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            toast.error(error.message);
        }
    }

    const handleDeleteUser = async (userId: string) => {
        const { error } = await supabaseClient.rpc('handle_delete_user', { user_id: userId })
        if (!error) {
            toast.success('Usuario eliminado correctamente');
            toast(
                'Se reiniciará la ventana para cargar al usuario',
                {
                    duration: 5000,
                }
            );

            const { error } = await supabaseClient
                .from('profiles')
                .delete()
                .eq('id', userId)
            if (error) {
                toast.error(error.message);
            }

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            toast.error(error.message);
        }
    }

    return (
        <div className='w-screen h-screen flex flex-col items-center justify-start'>

            <NavigationBar />

            <div className='w-full max-w-7xl h-full pt-6 flex flex-col'>

                <div className='w-full h-14 flex flex-row items-end justify-between cursor-default'>

                    <div className='w-auto h-full flex flex-col gap-0'>

                        <h4 className=' text-2xl font-bold text-[#1F1F21]'>Panel de Control</h4>

                    </div>

                </div>

                <div className=''>

                    <Table
                        isCompact
                        removeWrapper
                        aria-label="Example table with custom cells, pagination and sorting"
                        bottomContent={bottomContent}
                        bottomContentPlacement="outside"
                        checkboxesProps={{
                            classNames: {
                                wrapper: "after:bg-foreground after:text-background text-background",
                            },
                        }}
                        classNames={classNames}
                        selectedKeys={selectedKeys}
                        sortDescriptor={sortDescriptor}
                        topContent={topContent}
                        topContentPlacement="outside"
                        onSelectionChange={setSelectedKeys}
                        onSortChange={setSortDescriptor}
                    >
                        <TableHeader columns={headerColumns}>
                            {(column) => (
                                <TableColumn
                                    key={column.uid}
                                    align={column.uid === "actions" ? "center" : "start"}
                                    allowsSorting={column.sortable}
                                >
                                    {column.name}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody emptyContent={"No se encontraron usuarios"} items={sortedItems}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                </div>

            </div>

            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                placement="top-center"
                classNames={{
                    backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
                }}
                className='border-1 border-[#89898A] min-w-[600px] flex flex-col items-center justify-start gap-6 rounded-lg p-4'
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Registrar un usuario</ModalHeader>
                            <ModalBody className='w-full p-0'>
                                <Input
                                    autoFocus
                                    label="Nombre de usuario"
                                    placeholder="Ingresa un nombre de usuario"
                                    variant="bordered"
                                    onChange={e => setNewUserName(e.target.value)}
                                    radius='sm'
                                />
                                <Input
                                    autoFocus
                                    label="Correo Electronico"
                                    placeholder="Ingresa un correo electronico"
                                    variant="bordered"
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    radius='sm'
                                />
                                <Input
                                    label="Contraseña"
                                    placeholder="Ingresa una contraseña"
                                    type="password"
                                    variant="bordered"
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    radius='sm'
                                />
                                <RadioGroup
                                    style={{ width: '100%', display: 'flex' }}
                                    onChange={(e) => {
                                        setNewUserRole(e.target.value);
                                    }}
                                >
                                    <div className='w-full flex flex-row gap-2'>
                                        <CustomRadio description="Acceso total" value="admin" style={{ padding: '4px 8px', width: '100%' }}>
                                            Administrador
                                        </CustomRadio>
                                        <CustomRadio description="Acceso a ciertas funciones" value="user" style={{ padding: '4px 8px', width: '100%' }}>
                                            Usuario
                                        </CustomRadio>
                                    </div>
                                </RadioGroup>
                            </ModalBody>
                            <ModalFooter className='p-0 w-full min-h-[36px]'>
                                <Button className='bg-[#1F1F21] rounded-md w-full min-h-[36px] text-white font-semibold text-base' onPress={() => { handleSignUp(); onClose(); }}>
                                    Crear Usuario
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

        </div>
    )
}


















// Edit 'delete_user' function
// Name of function
// delete_user
// Name will also be used for the function name in postgres
// Schema

// public
// Tables made in the table editor will be in 'public'
// Arguments
// Arguments can be referenced in the function body using either names or numbers.

// user_id
// uuid
// Definition
// The language below should be written in `sql`.

// DELETE FROM auth.users WHERE id = user_id;