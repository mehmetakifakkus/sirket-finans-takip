<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateInstallmentsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'debt_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'due_date' => [
                'type' => 'DATE',
            ],
            'amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '15,2',
            ],
            'currency' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
                'default'    => 'TRY',
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['pending', 'paid', 'partial'],
                'default'    => 'pending',
            ],
            'paid_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '15,2',
                'default'    => 0.00,
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('debt_id');
        $this->forge->addKey('due_date');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('debt_id', 'debts', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('installments');
    }

    public function down()
    {
        $this->forge->dropTable('installments');
    }
}
